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
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  profileFields: ProviderFieldMap;
  extraAuthParams?: Record<string, string>;
}

export const PROVIDER_CONFIGS: Record<PlatformId, OAuthProviderConfig> = {
  instagram: {
    platform: "instagram",
    displayName: "Instagram",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/v19.0/me?fields=id,name,username,profile_pic",
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
    extraAuthParams: { code_challenge: "challenge", code_challenge_method: "plain" },
  },
  threads: {
    platform: "threads",
    displayName: "Threads",
    authorizeUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    profileUrl: "https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url",
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
    scopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"],
    clientIdEnv: "YOUTUBE_CLIENT_ID",
    clientSecretEnv: "YOUTUBE_CLIENT_SECRET",
    profileFields: { id: "sub", name: "name", avatar: "picture" },
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
};

export function providerConfig(platform: PlatformId): OAuthProviderConfig {
  return PROVIDER_CONFIGS[platform];
}

/** True once a real client id/secret are set for this platform. */
export function hasRealCredentials(platform: PlatformId): boolean {
  const c = PROVIDER_CONFIGS[platform];
  return Boolean(process.env[c.clientIdEnv] && process.env[c.clientSecretEnv]);
}
