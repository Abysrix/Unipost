import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { Profile, ProfileUpdateInput, Role, Plan } from "@/types/profile";

/** Server-only identity data layer. RLS enforces per-user ownership; the column-lockdown trigger (migration 0010) enforces which columns are actually writable through it. */

const PROFILE_COLS =
  "id,email,display_name,username,avatar_url,bio,timezone,role,plan,creator_score,xp,subscription_status,created_at,updated_at";

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/** The signed-in user's own profile. React `cache()`-wrapped so a layout + its page share one query per request, same pattern as `getCurrentUser`. */
export const getOwnProfile = cache(async (): Promise<Profile> => {
  const userId = await uid();
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", userId).single();
  if (error) throw error;
  return data as unknown as Profile;
});

/** Self-edit — request-scoped client. The privileged columns are dropped silently by the DB trigger even if a caller tried to pass them. */
export async function updateOwnProfile(input: ProfileUpdateInput): Promise<Profile> {
  const userId = await uid();
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").update(input).eq("id", userId).select(PROFILE_COLS).single();
  if (error) throw error;
  return data as unknown as Profile;
}

/** Admin-only role change. Service-role client — the column-lockdown trigger only exempts service-role writes, so this is the one legitimate path. */
export async function setRole(userId: string, role: Role): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

/** Real plan change (billing confirm, admin override). Service-role — same reason as `setRole`. */
export async function setPlan(userId: string, plan: Plan): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ plan }).eq("id", userId);
  if (error) throw error;
}

/** Best-effort sync of the cached `creator_score`/`xp` columns after a Creator Score/XP recompute. Never throws — the caller already has the authoritative values from its own computation; this is just keeping the cheap read-path columns fresh. */
export async function syncScoreAndXp(userId: string, creatorScore: number, xp: number): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("profiles").update({ creator_score: creatorScore, xp }).eq("id", userId);
  } catch {
    /* best-effort */
  }
}

/** Batch-fetch profiles by id — for admin listings that join against many users at once instead of one query per row. */
export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select(PROFILE_COLS).in("id", ids);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Profile[];
  return new Map(rows.map((p) => [p.id, p]));
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Profile) ?? null;
}
