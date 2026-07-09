/**
 * Sync Engine — pure decision logic (retry policy, expiry checks, error
 * classification). The actual DB-touching orchestration (`syncAccount`) lives
 * in `lib/db/integrations.ts`, same split as `lib/schedule/publishing.ts` (pure
 * interface) vs `lib/db/schedule.ts` (orchestration) from Sprint 5.
 */

export const TOKEN_EXPIRY_BUFFER_MIN = 10;

/** True when a token is already expired or will expire within the buffer window. */
export function isTokenNearExpiry(expiresAt: string | null, bufferMin = TOKEN_EXPIRY_BUFFER_MIN, now = Date.now()): boolean {
  if (!expiresAt) return false; // no expiry = long-lived token
  return new Date(expiresAt).getTime() - now <= bufferMin * 60_000;
}

/** Auth-shaped failures (bad/revoked token) shouldn't retry — they need reconnect, not a resend. */
export function isAuthError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b(401|403|invalid_grant|invalid_token|unauthorized|revoked)\b/i.test(msg);
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

/** Generic exponential-backoff retry for network-touching sync operations. */
export async function withRetry<T>(fn: () => Promise<T>, { retries = 2, baseDelayMs = 300 }: RetryOptions = {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (isAuthError(e) || attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}

export type SyncOutcome = { ok: true } | { ok: false; authError: boolean; message: string };
