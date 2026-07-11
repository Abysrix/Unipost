import type { PlatformId } from "@/config/platforms";

/**
 * Declarative OAuth provider registry. Adding a 7th platform is "add one config
 * object here" — never a new class, never a hardcoded conditional elsewhere.
 * Endpoint shapes match each platform's real public OAuth 2.0 documentation, so
 * wiring in a real `clientId`/`clientSecret` later requires zero code changes.
 */
export interface ProviderFieldMap {
  /** Dot-paths into the profile JSON response. */
  id: string;
  name: string;
  username?: string;
  avatar?: string;
}

export interface OAuthProviderConfig {
  platform: PlatformId;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  revokeUrl?: string;
  /** Shape `revokeAccessToken` should call `revokeUrl` with — providers don't agree on one. */
  revokeMethod?: "meta" | "google";
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  profileFields: ProviderFieldMap;
  extraAuthParams?: Record<string, string>;
  /** True if this platform's OAuth 2.0 flow requires PKCE (RFC 7636). Declarative — `requiresPkce()` reads this instead of hardcoding a platform check. */
  pkce?: boolean;
}

export const PROVIDER_CONFIGS: Record<PlatformId, OAuthProviderConfig> = {
  instagram: {
    platform: "instagram",
    displayName: "Instagram",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/v19.0/me?fields=id,name,username,profile_pic",
    // Meta's real revoke endpoint self-authenticates via the token in the
    // query string — no separate client credentials needed for this call.
    revokeUrl: "https://graph.facebook.com/v19.0/me/permissions",
    revokeMethod: "meta",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    clientIdEnv: "INSTAGRAM_CLIENT_ID",
    clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
    profileFields: { id: "id", name: "name", username: "username", avatar: "profile_pic" },
  },
  facebook: {
    platform: "facebook",
    displayName: "Facebook",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/v19.0/me?fields=id,name,picture",
    revokeUrl: "https://graph.facebook.com/v19.0/me/permissions",
    revokeMethod: "meta",
    scopes: ["public_profile", "pages_manage_posts", "pages_read_engagement"],
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    profileFields: { id: "id", name: "name", avatar: "picture.data.url" },
  },
  linkedin: {
    platform: "linkedin",
    displayName: "LinkedIn",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    profileUrl: "https://api.linkedin.com/v2/userinfo",
    // LinkedIn's revoke endpoint needs client_id/client_secret in the body —
    // a third, different shape from Meta/Google. Left unset (safe no-op in
    // revokeAccessToken) rather than guess at the exact shape without a
    // real app to verify it against; disconnecting still deletes UniPost's
    // own copy of the token immediately either way.
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    profileFields: { id: "sub", name: "name", avatar: "picture" },
  },
  x: {
    platform: "x",
    displayName: "X",
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    profileUrl: "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET",
    profileFields: { id: "data.id", name: "data.name", username: "data.username", avatar: "data.profile_image_url" },
    // Real S256 challenge is computed in buildAuthorizeUrl from a genuine
    // per-request verifier (lib/integrations/crypto.ts) — no placeholder
    // challenge params belong in this static config; same reason LinkedIn's
    // revoke shape is left unset rather than guessed at.
    pkce: true,
  },
  threads: {
    platform: "threads",
    displayName: "Threads",
    authorizeUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    profileUrl: "https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url",
    revokeUrl: "https://graph.threads.net/v1.0/me/permissions",
    revokeMethod: "meta",
    scopes: ["threads_basic", "threads_content_publish"],
    clientIdEnv: "THREADS_CLIENT_ID",
    clientSecretEnv: "THREADS_CLIENT_SECRET",
    profileFields: { id: "id", name: "username", username: "username", avatar: "threads_profile_picture_url" },
  },
  youtube: {
    platform: "youtube",
    displayName: "YouTube",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    revokeMethod: "google",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
      "openid",
      "profile"
    ],
    clientIdEnv: "YOUTUBE_CLIENT_ID",
    clientSecretEnv: "YOUTUBE_CLIENT_SECRET",
    profileFields: { id: "sub", name: "name", avatar: "picture" },
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
};

/**
 * Platforms visible in the integrations hub (`config/platforms.ts::
 * FUTURE_PLATFORMS`) but not yet connectable — real, documented endpoint
 * shapes, kept deliberately out of `PROVIDER_CONFIGS`/`PlatformId` rather
 * than widening that union. `PlatformId` is exhaustively matched across
 * scheduling, the composer, and analytics; widening it would ripple into
 * three subsystems this sprint doesn't touch, for zero functional gain
 * until a future sprint actually wires up publishing/composing for them.
 */
export const FUTURE_PROVIDER_CONFIGS: Record<string, Omit<OAuthProviderConfig, "platform"> & { platform: string }> = {
  tiktok: {
    platform: "tiktok",
    displayName: "TikTok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    profileUrl: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
    scopes: ["user.info.basic", "video.publish"],
    clientIdEnv: "TIKTOK_CLIENT_ID",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    profileFields: { id: "data.user.open_id", name: "data.user.display_name", avatar: "data.user.avatar_url" },
    pkce: true,
  },
  pinterest: {
    platform: "pinterest",
    displayName: "Pinterest",
    authorizeUrl: "https://www.pinterest.com/oauth",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    profileUrl: "https://api.pinterest.com/v5/user_account",
    scopes: ["boards:read", "pins:read", "pins:write"],
    clientIdEnv: "PINTEREST_CLIENT_ID",
    clientSecretEnv: "PINTEREST_CLIENT_SECRET",
    profileFields: { id: "username", name: "username", avatar: "profile_image" },
  },
};

export function providerConfig(platform: PlatformId): OAuthProviderConfig {
  return PROVIDER_CONFIGS[platform];
}

export function getClientId(config: OAuthProviderConfig): string | undefined {
  const primary = process.env[config.clientIdEnv];
  if (primary) return primary;
  if (config.platform === "youtube") {
    return process.env.GOOGLE_CLIENT_ID;
  }
  return undefined;
}

export function getClientSecret(config: OAuthProviderConfig): string | undefined {
  const primary = process.env[config.clientSecretEnv];
  if (primary) return primary;
  if (config.platform === "youtube") {
    return process.env.GOOGLE_CLIENT_SECRET;
  }
  return undefined;
}

/** True once a real client id/secret are set for this platform. */
export function hasRealCredentials(platform: PlatformId): boolean {
  const c = PROVIDER_CONFIGS[platform];
  return Boolean(getClientId(c) && getClientSecret(c));
}
