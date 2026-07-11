export type Role = "creator" | "admin" | "agency" | "enterprise";
export type Plan = "free" | "pro" | "agency";

/** A row of `public.profiles` — the real identity/RBAC source of truth (Integration Sprint 1). */
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  role: Role;
  plan: Plan;
  creator_score: number;
  xp: number;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

/** Fields a user can edit about themselves — the column-lockdown trigger silently drops anything else. */
export interface ProfileUpdateInput {
  display_name?: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  timezone?: string;
}
