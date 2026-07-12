import { getValidAccessToken, getDefaultAccountId } from "@/lib/db/integrations";
import { classifyHttpError, type PublishResult } from "@/lib/schedule/publishing";
import type { PlatformId } from "@/config/platforms";
import type { ScheduledEvent } from "@/types/schedule";

/** Every real provider adapter shares this — resolve who to publish as, fetch-with-error-classification, and the shared stub fallback — instead of each of the 4 reimplementing it. Mirrors `youtube.ts`'s own account-resolution pattern (`sp.connected_account_id` first, `getDefaultAccountId` fallback). */

export interface ResolvedAuth {
  accountId: string;
  accessToken: string;
  /** True when this connection is still Integration Sprint 2's simulated OAuth (no real developer credentials configured for this platform) — the token was never issued by the real platform, so calling its API with it would just fail confusingly. Providers should return `stubPublishResult` instead. */
  isStub: boolean;
}

/**
 * Resolves which connected account + access token a publish attempt should
 * use, or a ready-to-return failure explaining why it can't. Works from both
 * an interactive session and the cron/background publisher (no session at
 * all) — `getDefaultAccountId`/`getValidAccessToken` both handle that.
 */
export async function resolveAuth(sp: ScheduledEvent): Promise<{ auth: ResolvedAuth } | { result: PublishResult }> {
  return resolveAuthForPlatform(sp.platform, sp.user_id, sp.connected_account_id);
}

/**
 * Same resolution, without needing a full `ScheduledEvent` — for `delete`/
 * `update`, whose interface (`PlatformPublisher`, unchanged since Sprint 5)
 * only takes a bare `externalId`, not the schedule it came from. Known
 * limitation this exposes: deleting/editing an old post always uses the
 * *current* default account for the platform, which may differ from
 * whichever account originally published it if the user has since changed
 * their default (Integration Sprint 2) — same limitation `youtube.ts`'s
 * `delete()` has too. Neither method has a caller yet (confirmed — nothing
 * in `lib/db/schedule.ts` invokes them today), so this is documented as a
 * real constraint for whichever sprint wires them up, not silently papered
 * over with an unsafe cast.
 */
export async function resolveAuthForPlatform(platform: PlatformId, userId?: string, connectedAccountId?: string | null): Promise<{ auth: ResolvedAuth } | { result: PublishResult }> {
  const accountId = connectedAccountId ?? (await getDefaultAccountId(platform, userId));
  if (!accountId) {
    return { result: { ok: false, error: `No connected account for this platform. Connect one in Integrations first.`, errorCode: "no_connection" } };
  }
  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    return { result: { ok: false, error: "This connection's access has expired. Reconnect it in Integrations.", errorCode: "expired_token" } };
  }
  return { auth: { accountId, accessToken, isStub: accessToken.startsWith("stub_access_") } };
}

/** The same deterministic "success" every platform used before real adapters existed — used only for connections still in mock-OAuth mode, never for a real one. */
export function stubPublishResult(sp: ScheduledEvent): PublishResult {
  return { ok: true, externalId: `stub_${sp.platform}_${sp.id.slice(0, 8)}` };
}

const GRAPH = "https://graph.facebook.com/v19.0";

export interface ManagedPage {
  id: string;
  /** The Page's own access token — distinct from the user token that authenticated the connection, and what Facebook/Instagram publishing calls actually need. */
  access_token: string;
  instagram_business_account?: { id: string };
}

/**
 * Facebook Pages *and* Instagram Business Accounts are both reached through
 * the Pages a user manages — shared between both adapters instead of each
 * calling `/me/accounts` on its own.
 */
export async function listManagedPages(userAccessToken: string): Promise<{ pages: ManagedPage[] } | { result: PublishResult }> {
  const res = await fetchJson(`${GRAPH}/me/accounts?fields=id,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`, { method: "GET" });
  if (!res.ok) return { result: res.result };
  const pages = (res.data as { data?: ManagedPage[] } | null)?.data ?? [];
  return { pages };
}

/** Best-effort message extraction across the handful of error-body shapes Meta/LinkedIn/X actually use. */
function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.error && typeof b.error === "object") {
    const e = b.error as Record<string, unknown>;
    if (typeof e.message === "string") return e.message; // Meta Graph API
  }
  if (Array.isArray(b.errors) && b.errors[0] && typeof b.errors[0] === "object") {
    const first = b.errors[0] as Record<string, unknown>;
    if (typeof first.message === "string") return first.message; // X API v2
  }
  if (typeof b.detail === "string") return b.detail; // X API v2 (problem+json)
  if (typeof b.message === "string") return b.message; // LinkedIn
  return null;
}

/**
 * fetch() + JSON parse + HTTP-error classification, shared by every
 * provider. A 30s timeout keeps a downed platform from leaving a post stuck
 * in "publishing" forever. Response `headers` are exposed too — LinkedIn
 * returns a created post's id via the `x-restli-id` response header, not
 * the JSON body.
 */
export async function fetchJson(url: string, init: RequestInit): Promise<{ ok: true; data: unknown; status: number; headers: Headers } | { ok: false; result: PublishResult }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, result: { ok: false, error: timedOut ? "The platform didn't respond in time. Try again." : "Network error reaching the platform. Try again.", errorCode: "network_error" } };
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body — keep raw text in responseMeta below */
    }
  }

  if (!res.ok) {
    const code = classifyHttpError(res.status, text);
    return {
      ok: false,
      result: {
        ok: false,
        error: extractErrorMessage(json) ?? `Request failed (${res.status}).`,
        errorCode: code,
        responseMeta: { status: res.status, body: json ?? text.slice(0, 500) },
      },
    };
  }

  return { ok: true, data: json, status: res.status, headers: res.headers };
}
