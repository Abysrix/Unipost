import type { PlatformId } from "@/config/platforms";

export type ConnectionStatus = "connected" | "expired" | "revoked" | "error" | "disconnected";

/** A row of `public.connected_accounts` — one external account a user has linked. */
export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: PlatformId;
  account_id: string;
  display_name: string;
  username: string | null;
  profile_image: string | null;
  status: ConnectionStatus;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/** Never sent to the client — decrypted tokens stay server-only. */
export interface OAuthTokenRecord {
  id: string;
  connected_account_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  scope: string | null;
  expires_at: string | null;
}

export interface PlatformPermission {
  id: string;
  connected_account_id: string;
  scope: string;
  granted: boolean;
  created_at: string;
}

export type SyncType = "manual" | "auto" | "token_refresh" | "profile" | "health_check";
export interface SyncLog {
  id: string;
  connected_account_id: string;
  user_id: string;
  sync_type: SyncType;
  status: "success" | "failed";
  message: string | null;
  created_at: string;
}

export type IntegrationEventType =
  | "connected" | "reconnected" | "disconnected" | "revoked"
  | "token_refreshed" | "sync_completed" | "sync_failed" | "permission_changed";

export interface IntegrationEvent {
  id: string;
  user_id: string;
  connected_account_id: string | null;
  platform: PlatformId;
  event_type: IntegrationEventType;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** A connected account joined with its granted permissions (hub/detail rendering). */
export interface ConnectionWithPermissions extends ConnectedAccount {
  permissions: PlatformPermission[];
}

/** Normalized profile shape every provider adapter returns, regardless of platform. */
export interface ProviderProfile {
  accountId: string;
  displayName: string;
  username?: string;
  profileImage?: string;
}

/** Normalized token shape every provider adapter returns. */
export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresInSec?: number;
  scope?: string;
}
