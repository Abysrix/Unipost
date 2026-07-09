import { randomBytes } from "crypto";
import type { PlatformId } from "@/config/platforms";
import type { ProviderProfile, ProviderTokens } from "@/types/integrations";
import { providerConfig, hasRealCredentials } from "./providers";

/**
 * Generic OAuth 2.0 engine — operates entirely off `OAuthProviderConfig`, so it
 * never branches on which platform it's talking to. When a provider's real
 * credentials aren't configured, the SAME functions return deterministic stub
 * data (mirroring lib/schedule/publishing.ts's stub philosophy) instead of
 * calling out to a provider that would reject an empty client_id. The moment
 * real credentials are added to .env.local, these functions make real HTTP
 * calls — zero code changes required anywhere else.
 */

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function seededInt(seed: string, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % max;
}

const ADJ = ["Creative", "Bold", "Bright", "Rising", "Modern", "Daily", "Studio", "Indie", "Northside", "Urban"];
const NOUN = ["Creator", "Studio", "Collective", "Works", "Lab", "Media", "Projects", "Co"];

/** Deterministic per-user-per-platform stub identity — stable across reconnects/syncs. */
function stubProfile(platform: PlatformId, seedKey: string): ProviderProfile {
  const adj = ADJ[seededInt(`${seedKey}:a`, ADJ.length)];
  const noun = NOUN[seededInt(`${seedKey}:n`, NOUN.length)];
  const num = 100 + seededInt(`${seedKey}:num`, 900);
  return {
    accountId: `stub_${platform}_${seededInt(seedKey, 999_999)}`,
    displayName: `${adj} ${noun}`,
    username: `${adj.toLowerCase()}${noun.toLowerCase()}${num}`,
  };
}

/** The identity the mock-consent screen previews (and connecting will create). */
export function previewStubIdentity(platform: PlatformId, seedKey: string): ProviderProfile {
  return stubProfile(platform, seedKey);
}

function stubTokens(scope: string): ProviderTokens {
  return {
    accessToken: `stub_access_${randomBytes(16).toString("hex")}`,
    refreshToken: `stub_refresh_${randomBytes(16).toString("hex")}`,
    tokenType: "bearer",
    expiresInSec: 3600,
    scope,
  };
}

/**
 * The URL to send the browser to. Real provider URL once credentials exist;
 * otherwise an internal mock-consent page that round-trips through the same
 * callback route.
 */
export function buildAuthorizeUrl(platform: PlatformId, state: string, redirectUri: string): string {
  const config = providerConfig(platform);
  if (!hasRealCredentials(platform)) {
    return `/integrations/connect/${platform}?state=${encodeURIComponent(state)}`;
  }
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", process.env[config.clientIdEnv] as string);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  for (const [k, v] of Object.entries(config.extraAuthParams ?? {})) url.searchParams.set(k, v);
  return url.toString();
}

export async function fetchProfile(platform: PlatformId, accessToken: string, seedKey?: string): Promise<ProviderProfile> {
  const config = providerConfig(platform);
  if (accessToken.startsWith("stub_access_")) return stubProfile(platform, seedKey ?? accessToken);

  const res = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`${config.displayName} profile fetch failed (${res.status}).`);
  const json = (await res.json()) as unknown;
  const f = config.profileFields;
  return {
    accountId: String(getPath(json, f.id) ?? ""),
    displayName: String(getPath(json, f.name) ?? config.displayName),
    username: f.username ? String(getPath(json, f.username) ?? "") : undefined,
    profileImage: f.avatar ? String(getPath(json, f.avatar) ?? "") || undefined : undefined,
  };
}

/** Exchange an authorization code for tokens + the connecting account's profile. */
export async function exchangeCode(
  platform: PlatformId,
  code: string,
  redirectUri: string,
  seedKey: string,
): Promise<{ tokens: ProviderTokens; profile: ProviderProfile }> {
  const config = providerConfig(platform);
  if (!hasRealCredentials(platform)) {
    return { tokens: stubTokens(config.scopes.join(" ")), profile: stubProfile(platform, seedKey) };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env[config.clientIdEnv] as string,
    client_secret: process.env[config.clientSecretEnv] as string,
  });
  const tokenRes = await fetch(config.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!tokenRes.ok) throw new Error(`${config.displayName} token exchange failed (${tokenRes.status}).`);
  const json = (await tokenRes.json()) as Record<string, unknown>;
  const tokens: ProviderTokens = {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : undefined,
    tokenType: json.token_type ? String(json.token_type) : "bearer",
    expiresInSec: typeof json.expires_in === "number" ? json.expires_in : undefined,
    scope: json.scope ? String(json.scope) : config.scopes.join(" "),
  };
  const profile = await fetchProfile(platform, tokens.accessToken, seedKey);
  return { tokens, profile };
}

export async function refreshAccessToken(platform: PlatformId, refreshToken: string): Promise<ProviderTokens> {
  const config = providerConfig(platform);
  if (refreshToken.startsWith("stub_refresh_")) return stubTokens(config.scopes.join(" "));

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env[config.clientIdEnv] as string,
    client_secret: process.env[config.clientSecretEnv] as string,
  });
  const res = await fetch(config.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`${config.displayName} token refresh failed (${res.status}).`);
  const json = (await res.json()) as Record<string, unknown>;
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : refreshToken,
    tokenType: json.token_type ? String(json.token_type) : "bearer",
    expiresInSec: typeof json.expires_in === "number" ? json.expires_in : undefined,
    scope: json.scope ? String(json.scope) : undefined,
  };
}

/** Best-effort revoke. No-op for stub tokens or providers without a revoke endpoint. */
export async function revokeAccessToken(platform: PlatformId, accessToken: string): Promise<void> {
  const config = providerConfig(platform);
  if (!config.revokeUrl || accessToken.startsWith("stub_access_")) return;
  try {
    await fetch(`${config.revokeUrl}?token=${encodeURIComponent(accessToken)}`, { method: "POST" });
  } catch {
    /* best-effort */
  }
}
