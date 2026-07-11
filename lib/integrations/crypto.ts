import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Token encryption + OAuth state signing.
 *
 * ONE root secret (`INTEGRATIONS_SECRET_KEY`) is purpose-separated via HKDF into
 * two independent subkeys — one for AES-256-GCM token encryption, one for HMAC
 * state signing — so a single env var covers both needs without mixing concerns.
 * Fails closed: if the secret isn't configured, callers get a clear error
 * instead of tokens silently being stored in plaintext.
 */

export class IntegrationsConfigError extends Error {}

function rootSecret(): Buffer {
  const raw = process.env.INTEGRATIONS_SECRET_KEY;
  if (!raw || raw.length < 16) {
    throw new IntegrationsConfigError(
      "INTEGRATIONS_SECRET_KEY is not configured (needs 16+ chars). Add it to .env.local — see .env.example.",
    );
  }
  return Buffer.from(raw, "utf8");
}

function deriveKey(info: string): Buffer {
  const bits = hkdfSync("sha256", rootSecret(), Buffer.alloc(0), info, 32);
  return Buffer.from(bits);
}

/* ── Token encryption (AES-256-GCM) ── */
const ENC_INFO = "unipost.integrations.token-encryption.v1";

/** Encrypt a token for storage. Returns `iv.authTag.ciphertext`, all base64url. */
export function encryptToken(plaintext: string): string {
  const key = deriveKey(ENC_INFO);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

/** Decrypt a token produced by `encryptToken`. Throws on tampering or wrong key. */
export function decryptToken(packed: string): string {
  const [ivB64, tagB64, ctB64] = packed.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed encrypted token.");
  const key = deriveKey(ENC_INFO);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]);
  return plaintext.toString("utf8");
}

/* ── OAuth state signing (CSRF protection for the connect flow) ── */
const STATE_INFO = "unipost.integrations.oauth-state.v1";

export interface OAuthState {
  userId: string;
  platform: string;
  nonce: string;
  /** Where to send the user back to in the app after connecting. */
  returnTo: string;
  iat: number;
  codeVerifier?: string;
}

/** Sign a state payload → opaque token to round-trip through the OAuth redirect. */
export function signState(state: OAuthState): string {
  const key = deriveKey(STATE_INFO);
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify + parse a signed state token. Returns null if invalid, tampered, or expired (>10min). */
export function verifyState(token: string): OAuthState | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const key = deriveKey(STATE_INFO);
    const expected = createHmac("sha256", key).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    if (Date.now() - state.iat > 10 * 60_000) return null; // 10 minute window
    return state;
  } catch {
    return null;
  }
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}
