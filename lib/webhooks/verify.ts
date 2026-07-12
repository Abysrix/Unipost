import { createHmac, timingSafeEqual } from "crypto";

/**
 * Shared webhook primitives — signature verification + the idempotency hash
 * every `webhook_events` row is keyed on (Phase 4/10). Timing-safe
 * comparison throughout, same principle as `lib/integrations/crypto.ts`'s
 * OAuth state verification: a signature check that short-circuits on the
 * first mismatched byte leaks how much of the signature was guessed
 * correctly via response-time differences.
 */

export function hashPayload(rawBody: string): string {
  return createHmac("sha256", "webhook-idempotency").update(rawBody).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Meta (Instagram/Facebook/Threads) — `X-Hub-Signature-256: sha256={hex}`, HMAC-SHA256 of the raw body using the App Secret. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return timingSafeEqualHex(header.slice(7), expected);
}

/** X (Twitter) Account Activity API — `x-twitter-webhooks-signature: sha256={base64}`, HMAC-SHA256 of the raw body using the OAuth 1.0a Consumer Secret (a distinct credential from this app's OAuth 2.0 publishing/analytics client secret — see the route's own doc comment). */
export function verifyXSignature(rawBody: string, header: string | null, consumerSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", consumerSecret).update(rawBody).digest("base64");
  return timingSafeEqualHex(header.slice(7), expected);
}

/** X's CRC handshake response — same HMAC, base64, prefixed for the `response_token` field X expects back. */
export function xCrcResponseToken(crcToken: string, consumerSecret: string): string {
  return "sha256=" + createHmac("sha256", consumerSecret).update(crcToken).digest("base64");
}
