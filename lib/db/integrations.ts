import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { PlatformId } from "@/config/platforms";
import { providerConfig } from "@/lib/integrations/providers";
import { fetchProfile, refreshAccessToken, revokeAccessToken } from "@/lib/integrations/oauth";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import { isTokenNearExpiry, isAuthError, withRetry, type SyncOutcome } from "@/lib/integrations/sync";
import { getCurrentPlan } from "@/lib/db/plan";
import { planLimits } from "@/lib/billing/plans";
import type {
  ConnectedAccount, ConnectionWithPermissions, PlatformPermission,
  SyncLog, SyncType, IntegrationEvent, IntegrationEventType, ProviderProfile, ProviderTokens,
} from "@/types/integrations";

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const ACCOUNT_COLS = "id,user_id,platform,account_id,display_name,username,profile_image,status,last_sync_at,last_error,created_at,updated_at";
const PERM_COLS = "id,connected_account_id,scope,granted,created_at";
const LOG_COLS = "id,connected_account_id,user_id,sync_type,status,message,created_at";
const EVENT_COLS = "id,user_id,connected_account_id,platform,event_type,message,metadata,created_at";

/* ── Reads ── */
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

/* ── Internal helpers ── */
async function logEvent(userId: string, platform: PlatformId, type: IntegrationEventType, accountId: string | null, message?: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const supabase = createClient();
  await supabase.from("integration_events").insert({ user_id: userId, connected_account_id: accountId, platform, event_type: type, message: message ?? null, metadata });
}

async function logSync(userId: string, accountId: string, type: SyncType, status: "success" | "failed", message?: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("sync_logs").insert({ user_id: userId, connected_account_id: accountId, sync_type: type, status, message: message ?? null });
}

async function saveTokens(accountId: string, userId: string, tokens: ProviderTokens): Promise<void> {
  const supabase = createClient();
  const expiresAt = tokens.expiresInSec ? new Date(Date.now() + tokens.expiresInSec * 1000).toISOString() : null;
  const { error } = await supabase.from("oauth_tokens").upsert(
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
  const supabase = createClient();
  const requested = providerConfig(platform).scopes;
  const granted = new Set((grantedScope ?? requested.join(" ")).split(/[\s,]+/).filter(Boolean));
  await supabase.from("platform_permissions").delete().eq("connected_account_id", accountId);
  const rows = requested.map((scope) => ({ connected_account_id: accountId, user_id: userId, scope, granted: granted.has(scope) || granted.size === 0 }));
  if (rows.length > 0) await supabase.from("platform_permissions").insert(rows);
}

/** Decrypted tokens for server-only use (sync, publishing). Never sent to the client. */
export async function getDecryptedTokens(accountId: string): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null } | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("oauth_tokens").select("access_token_enc,refresh_token_enc,expires_at").eq("connected_account_id", accountId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { access_token_enc: string; refresh_token_enc: string | null; expires_at: string | null };
  return {
    accessToken: decryptToken(row.access_token_enc),
    refreshToken: row.refresh_token_enc ? decryptToken(row.refresh_token_enc) : null,
    expiresAt: row.expires_at,
  };
}

/* ── Writes ── */
/** Persist a completed OAuth round-trip (real or stub). Upserts on (user, platform, account_id). */
export async function completeConnection(platform: PlatformId, profile: ProviderProfile, tokens: ProviderTokens): Promise<ConnectedAccount> {
  const userId = await uid();
  const supabase = createClient();

  const { data: existing } = await supabase
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
      const { count } = await supabase.from("connected_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "disconnected");
      if ((count ?? 0) >= limit) {
        throw new Error(`You've reached your ${planLimits(plan).name} plan's limit of ${limit} connected accounts. Upgrade to connect more.`);
      }
    }
  }

  const { data, error } = await supabase
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

  await saveTokens(account.id, userId, tokens);
  await savePermissions(account.id, userId, platform, tokens.scope);
  await logEvent(userId, platform, isReconnect ? "reconnected" : "connected", account.id, `${isReconnect ? "Reconnected" : "Connected"} ${profile.displayName}`);

  return account;
}

/** Disconnect: best-effort revoke, drop tokens, mark the account disconnected. */
export async function disconnectAccount(id: string): Promise<void> {
  const userId = await uid();
  const supabase = createClient();
  const account = await getConnection(id);
  if (!account) return;

  try {
    const tokens = await getDecryptedTokens(id);
    if (tokens) await revokeAccessToken(account.platform, tokens.accessToken);
  } catch {
    /* best-effort — decrypt/revoke failures shouldn't block a local disconnect */
  }

  await supabase.from("oauth_tokens").delete().eq("connected_account_id", id);
  await supabase.from("connected_accounts").update({ status: "disconnected" }).eq("id", id);
  await logEvent(userId, account.platform, "disconnected", id, `Disconnected ${account.display_name}`);
}

export async function deleteConnection(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("connected_accounts").delete().eq("id", id);
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
  const supabase = createClient();
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
    await supabase
      .from("connected_accounts")
      .update({ display_name: profile.displayName, username: profile.username ?? account.username, profile_image: profile.profileImage ?? account.profile_image, status: "connected", last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", id);

    await logSync(userId, id, type, "success");
    await logEvent(userId, account.platform, "sync_completed", id, "Sync completed");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    const authFailure = isAuthError(e);
    await supabase.from("connected_accounts").update({ status: authFailure ? "expired" : "error", last_error: message }).eq("id", id);
    await logSync(userId, id, type, "failed", message);
    await logEvent(userId, account.platform, "sync_failed", id, message);
    return { ok: false, authError: authFailure, message };
  }
}

/** Lightweight check: is the stored token still valid (without a full profile refresh)? */
export async function validateConnection(id: string): Promise<SyncOutcome> {
  return syncAccount(id, "health_check");
}
