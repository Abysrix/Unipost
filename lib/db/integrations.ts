import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { PlatformId } from "@/config/platforms";
import { providerConfig } from "@/lib/integrations/providers";
import { fetchProfile, refreshAccessToken, revokeAccessToken } from "@/lib/integrations/oauth";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import { isTokenNearExpiry, isAuthError, withRetry, type SyncOutcome } from "@/lib/integrations/sync";
import { getCurrentPlan } from "@/lib/db/plan";
import { planLimits } from "@/lib/billing/plans";
import { seedAnalyticsForPlatform } from "@/lib/db/growth";
import { invalidateCreatorContext } from "@/lib/ai/contextCache";
import type {
  ConnectedAccount, ConnectionWithPermissions, PlatformPermission,
  SyncLog, SyncType, IntegrationEvent, IntegrationEventType, ProviderProfile, ProviderTokens,
} from "@/types/integrations";

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const ACCOUNT_COLS = "id,user_id,platform,account_id,display_name,username,profile_image,nickname,is_default,status,last_sync_at,last_error,created_at,updated_at";
const PERM_COLS = "id,connected_account_id,scope,granted,created_at";
const LOG_COLS = "id,connected_account_id,user_id,sync_type,status,message,created_at";
const EVENT_COLS = "id,user_id,connected_account_id,platform,event_type,message,metadata,created_at";

/* ── Reads (request-scoped client — own-row SELECT policies are unchanged by migration 0011) ── */
export async function listConnections(): Promise<ConnectionWithPermissions[]> {
  const supabase = createClient();
  const { data: accounts, error } = await supabase.from("connected_accounts").select(ACCOUNT_COLS).order("platform").order("created_at");
  if (error) throw error;
  const rows = (accounts ?? []) as unknown as ConnectedAccount[];
  if (rows.length === 0) return [];

  const { data: perms, error: pErr } = await supabase.from("platform_permissions").select(PERM_COLS).in("connected_account_id", rows.map((r) => r.id));
  if (pErr) throw pErr;
  const byAccount = new Map<string, PlatformPermission[]>();
  for (const p of (perms ?? []) as unknown as PlatformPermission[]) {
    byAccount.set(p.connected_account_id, [...(byAccount.get(p.connected_account_id) ?? []), p]);
  }
  return rows.map((r) => ({ ...r, permissions: byAccount.get(r.id) ?? [] }));
}

export async function getConnection(id: string): Promise<ConnectionWithPermissions | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("connected_accounts").select(ACCOUNT_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const account = data as unknown as ConnectedAccount;
  const { data: perms, error: pErr } = await supabase.from("platform_permissions").select(PERM_COLS).eq("connected_account_id", id);
  if (pErr) throw pErr;
  return { ...account, permissions: (perms ?? []) as unknown as PlatformPermission[] };
}

export async function listSyncLogs(accountId: string, limit = 20): Promise<SyncLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("sync_logs").select(LOG_COLS).eq("connected_account_id", accountId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as SyncLog[];
}

export async function listIntegrationEvents(accountId?: string, limit = 20): Promise<IntegrationEvent[]> {
  const supabase = createClient();
  let q = supabase.from("integration_events").select(EVENT_COLS).order("created_at", { ascending: false }).limit(limit);
  if (accountId) q = q.eq("connected_account_id", accountId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as IntegrationEvent[];
}

/**
 * Decrypted tokens for server-only use (sync, publishing). Never sent to the
 * client. Admin client, not request-scoped — this must also work from the
 * cron/background publisher (`lib/db/admin/scheduler.ts`), which has no
 * user session for RLS's `auth.uid() = user_id` to match against. Safe:
 * every existing caller already resolves `accountId` through its own
 * properly-scoped path first (an interactive session's `uid()`-checked
 * `getConnection`, or the cron worker's own admin-scoped `scheduled_posts`
 * read) — this is a narrow, always-specific-id lookup, not a listing.
 */
export async function getDecryptedTokens(accountId: string): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("oauth_tokens").select("access_token_enc,refresh_token_enc,expires_at").eq("connected_account_id", accountId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { access_token_enc: string; refresh_token_enc: string | null; expires_at: string | null };
  return {
    accessToken: decryptToken(row.access_token_enc),
    refreshToken: row.refresh_token_enc ? decryptToken(row.refresh_token_enc) : null,
    expiresAt: row.expires_at,
  };
}

/* ── Writes — all via the service-role client (migration 0011 dropped the
 * authenticated-role write policies these used to run under). Still gated
 * by `uid()`/explicit `user_id` filters in application code, exactly the
 * pattern `lib/db/billing.ts` already uses. ── */
async function logEvent(userId: string, platform: PlatformId, type: IntegrationEventType, accountId: string | null, message?: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("integration_events").insert({ user_id: userId, connected_account_id: accountId, platform, event_type: type, message: message ?? null, metadata });
}

async function logSync(userId: string, accountId: string, type: SyncType, status: "success" | "failed", message?: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("sync_logs").insert({ user_id: userId, connected_account_id: accountId, sync_type: type, status, message: message ?? null });
}

async function saveTokens(accountId: string, userId: string, tokens: ProviderTokens): Promise<void> {
  const admin = createAdminClient();
  const expiresAt = tokens.expiresInSec ? new Date(Date.now() + tokens.expiresInSec * 1000).toISOString() : null;
  const { error } = await admin.from("oauth_tokens").upsert(
    {
      connected_account_id: accountId,
      user_id: userId,
      access_token_enc: encryptToken(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      token_type: tokens.tokenType,
      scope: tokens.scope ?? null,
      expires_at: expiresAt,
    },
    { onConflict: "connected_account_id" },
  );
  if (error) throw error;
}

async function savePermissions(accountId: string, userId: string, platform: PlatformId, grantedScope?: string): Promise<void> {
  const admin = createAdminClient();
  const requested = providerConfig(platform).scopes;
  const granted = new Set((grantedScope ?? requested.join(" ")).split(/[\s,]+/).filter(Boolean));
  await admin.from("platform_permissions").delete().eq("connected_account_id", accountId);
  
  const rows = requested.map((scope) => {
    let isGranted = granted.has(scope) || granted.size === 0;
    // Google normalizes "profile" and "email" short scopes to full URLs in its token responses
    if (!isGranted && scope === "profile") {
      isGranted = granted.has("https://www.googleapis.com/auth/userinfo.profile");
    }
    if (!isGranted && scope === "email") {
      isGranted = granted.has("https://www.googleapis.com/auth/userinfo.email");
    }
    return {
      connected_account_id: accountId,
      user_id: userId,
      scope,
      granted: isGranted,
    };
  });
  
  if (rows.length > 0) await admin.from("platform_permissions").insert(rows);
}

/** Persist a completed OAuth round-trip (real or stub). Upserts on (user, platform, account_id). */
export async function completeConnection(platform: PlatformId, profile: ProviderProfile, tokens: ProviderTokens): Promise<ConnectedAccount> {
  const userId = await uid();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("connected_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("account_id", profile.accountId)
    .maybeSingle();
  const isReconnect = Boolean(existing);

  if (!isReconnect) {
    const plan = await getCurrentPlan();
    const limit = planLimits(plan).maxConnectedAccounts;
    if (Number.isFinite(limit)) {
      const { count } = await admin.from("connected_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "disconnected");
      if ((count ?? 0) >= limit) {
        throw new Error(`You've reached your ${planLimits(plan).name} plan's limit of ${limit} connected accounts. Upgrade to connect more.`);
      }
    }
  }

  const { data, error } = await admin
    .from("connected_accounts")
    .upsert(
      {
        user_id: userId,
        platform,
        account_id: profile.accountId,
        display_name: profile.displayName,
        username: profile.username ?? null,
        profile_image: profile.profileImage ?? null,
        status: "connected",
        last_sync_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "user_id,platform,account_id" },
    )
    .select(ACCOUNT_COLS)
    .single();
  if (error) throw error;
  const account = data as unknown as ConnectedAccount;

  // First account ever connected for this platform becomes the default — no
  // extra step for the common case of exactly one account per platform.
  if (!isReconnect) {
    const { count: siblingCount } = await admin.from("connected_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("platform", platform).neq("status", "disconnected").neq("id", account.id);
    if (!siblingCount) await admin.from("connected_accounts").update({ is_default: true }).eq("id", account.id);
  }

  await saveTokens(account.id, userId, tokens);
  await savePermissions(account.id, userId, platform, tokens.scope);
  await logEvent(userId, platform, isReconnect ? "reconnected" : "connected", account.id, `${isReconnect ? "Reconnected" : "Connected"} ${profile.displayName}`);
  await seedAnalyticsForPlatform(platform).catch(() => {});
  await invalidateCreatorContext(userId).catch(() => {});
  if (!isReconnect) await logProductEvent("account_connected", userId, { platform });

  return account;
}

/** Disconnect: best-effort revoke, drop tokens, mark the account disconnected. */
export async function disconnectAccount(id: string): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  const account = await getConnection(id);
  if (!account) return;

  try {
    const tokens = await getDecryptedTokens(id);
    if (tokens) await revokeAccessToken(account.platform, tokens.accessToken);
  } catch {
    /* best-effort — decrypt/revoke failures shouldn't block a local disconnect */
  }

  await admin.from("oauth_tokens").delete().eq("connected_account_id", id);
  await admin.from("connected_accounts").update({ status: "disconnected", is_default: false }).eq("id", id);
  await logEvent(userId, account.platform, "disconnected", id, `Disconnected ${account.display_name}`);

  // Promote another still-connected account of the same platform to default, if any.
  if (account.is_default) {
    const { data: next } = await admin.from("connected_accounts").select("id").eq("user_id", userId).eq("platform", account.platform).neq("status", "disconnected").order("created_at").limit(1).maybeSingle();
    if (next) await admin.from("connected_accounts").update({ is_default: true }).eq("id", (next as { id: string }).id);
  }
}

export async function deleteConnection(id: string): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  const { error } = await admin.from("connected_accounts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/** Set which connected account is the default for its platform (used when scheduling/publishing without picking one explicitly). Clears any previous default on the same platform first — the partial unique index only allows one. */
export async function setDefaultAccount(id: string): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  const account = await getConnection(id);
  if (!account) throw new Error("Connection not found.");

  await admin.from("connected_accounts").update({ is_default: false }).eq("user_id", userId).eq("platform", account.platform);
  const { error } = await admin.from("connected_accounts").update({ is_default: true }).eq("id", id);
  if (error) throw error;
  await logEvent(userId, account.platform, "permission_changed", id, `${account.display_name} set as default ${account.platform} account`);
}

/** Rename a connection's local display nickname — cosmetic only, never sent to the provider. */
export async function renameConnection(id: string, nickname: string | null): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  const { error } = await admin.from("connected_accounts").update({ nickname }).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/**
 * Sync Engine orchestration — refreshes the token if it's near expiry, then
 * re-fetches the profile, updating status/last_sync_at/last_error. Retries
 * transient failures with backoff; auth failures (bad/revoked token) mark the
 * account `expired` so the UI prompts Reconnect instead of a generic error.
 * Called manually today ("Sync Now"); a future cron/worker can call the same
 * function per due account (no other code needs to change).
 */
export async function syncAccount(id: string, type: SyncType = "manual"): Promise<SyncOutcome> {
  const userId = await uid();
  const admin = createAdminClient();
  const account = await getConnection(id);
  if (!account) return { ok: false, authError: false, message: "Connection not found." };

  try {
    let tokens = await getDecryptedTokens(id);
    if (!tokens) throw new Error("No tokens stored for this connection.");

    if (isTokenNearExpiry(tokens.expiresAt) && tokens.refreshToken) {
      const refreshed = await withRetry(() => refreshAccessToken(account.platform, tokens!.refreshToken as string));
      await saveTokens(id, userId, refreshed);
      tokens = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken ?? tokens.refreshToken, expiresAt: null };
      await logEvent(userId, account.platform, "token_refreshed", id, "Access token refreshed");
      await logSync(userId, id, "token_refresh", "success");
    }

    const profile = await withRetry(() => fetchProfile(account.platform, tokens!.accessToken, `${userId}:${account.platform}`));
    await admin
      .from("connected_accounts")
      .update({ display_name: profile.displayName, username: profile.username ?? account.username, profile_image: profile.profileImage ?? account.profile_image, status: "connected", last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", id);

    await seedAnalyticsForPlatform(account.platform).catch(() => {});

    await logSync(userId, id, type, "success");
    await logEvent(userId, account.platform, "sync_completed", id, "Sync completed");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    const authFailure = isAuthError(e);
    await admin.from("connected_accounts").update({ status: authFailure ? "expired" : "error", last_error: message }).eq("id", id);
    await logSync(userId, id, type, "failed", message);
    await logEvent(userId, account.platform, "sync_failed", id, message);
    return { ok: false, authError: authFailure, message };
  }
}

/** Lightweight check: is the stored token still valid (without a full profile refresh)? */
export async function validateConnection(id: string): Promise<SyncOutcome> {
  return syncAccount(id, "health_check");
}

/**
 * The connected account a publish attempt should use when a schedule wasn't
 * explicitly tied to one — the account flagged `is_default` for that
 * platform, or `null` if the user has no connected, non-disconnected
 * account for it at all.
 */
export async function getDefaultAccountId(platform: PlatformId, userId?: string): Promise<string | null> {
  const targetUid = userId ?? (await uid());
  const admin = createAdminClient();
  const { data } = await admin
    .from("connected_accounts")
    .select("id")
    .eq("user_id", targetUid)
    .eq("platform", platform)
    .neq("status", "disconnected")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Narrow admin-scoped connection lookup for internal use only — no RLS
 * dependency, since it's always called with an `accountId` already resolved
 * through a properly-scoped path (an interactive session's own
 * `uid()`-checked query, or the cron worker's own trustworthy
 * `scheduled_posts` read). Not exported: general-purpose reads should go
 * through `getConnection`, which still enforces per-user ownership via RLS.
 */
async function getAccountPlatform(accountId: string): Promise<{ user_id: string; platform: PlatformId } | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("connected_accounts").select("user_id,platform").eq("id", accountId).maybeSingle();
  return (data as { user_id: string; platform: PlatformId } | null) ?? null;
}

/**
 * The platform's own external account id (`connected_accounts.account_id` —
 * e.g. a LinkedIn member id or Instagram/Facebook user id), as opposed to
 * `accountId` elsewhere in this module, which always means UniPost's
 * internal `connected_accounts.id`. Providers that must embed the external
 * id in a request body (LinkedIn's `author` URN) need this; most don't.
 * Admin-scoped for the same cron-safety reason as `getAccountPlatform` above.
 */
export async function getAccountExternalId(accountId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("connected_accounts").select("account_id").eq("id", accountId).maybeSingle();
  return (data as { account_id: string } | null)?.account_id ?? null;
}

/**
 * Silent refresh — returns a definitely-usable access token, transparently
 * refreshing first if it's near expiry. Anything that needs to actually call
 * a provider's API (publish/analytics-sync) should go through this instead
 * of `getDecryptedTokens` directly, so it never hands back a token that's
 * about to be rejected. Works from both an interactive session and the
 * cron/background publisher (`lib/db/admin/scheduler.ts`), which has no
 * session at all — hence the admin-scoped lookup below instead of
 * `getConnection`.
 */
export async function getValidAccessToken(accountId: string): Promise<string | null> {
  const tokens = await getDecryptedTokens(accountId);
  if (!tokens) return null;
  if (!isTokenNearExpiry(tokens.expiresAt) || !tokens.refreshToken) return tokens.accessToken;

  const account = await getAccountPlatform(accountId);
  if (!account) return null;
  const userId = account.user_id;

  const refreshed = await withRetry(() => refreshAccessToken(account.platform, tokens.refreshToken as string));
  await saveTokens(accountId, userId, refreshed);
  await logEvent(userId, account.platform, "token_refreshed", accountId, "Access token silently refreshed");
  return refreshed.accessToken;
}
