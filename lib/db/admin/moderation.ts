import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "./audit";
import type { ModeratedPost } from "@/types/admin";

const COLS = "id,user_id,title,status,flagged,moderation_note,platforms,created_at,updated_at";

export interface ModerationFilters {
  query?: string;
  status?: string;
  flaggedOnly?: boolean;
}

/** Every user's posts (admin-scoped, across the whole platform) — content moderation queue. */
export async function listPostsForModeration(filters: ModerationFilters = {}, limit = 100): Promise<ModeratedPost[]> {
  const admin = createAdminClient();
  let q = admin.from("posts").select(COLS).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.flaggedOnly) q = q.eq("flagged", true);
  if (filters.query) q = q.ilike("title", `%${filters.query}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ModeratedPost[];
}

export async function flagPost(id: string, note: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("posts").update({ flagged: true, moderation_note: note }).eq("id", id);
  if (error) throw error;
  await logAudit("admin_action", "content_flagged", { actorId, message: note, metadata: { postId: id } });
}

export async function unflagPost(id: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("posts").update({ flagged: false, moderation_note: null }).eq("id", id);
  if (error) throw error;
  await logAudit("admin_action", "content_unflagged", { actorId, metadata: { postId: id } });
}

/** Admin soft-delete — same mechanism as the owner's own Trash, just admin-initiated. */
export async function adminDeletePost(id: string, actorId: string, reason?: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await logAudit("admin_action", "content_deleted", { actorId, message: reason, metadata: { postId: id } });
}

export async function bulkModerate(ids: string[], action: "flag" | "unflag" | "delete", actorId: string, note?: string): Promise<void> {
  for (const id of ids) {
    if (action === "flag") await flagPost(id, note ?? "Bulk flagged", actorId);
    else if (action === "unflag") await unflagPost(id, actorId);
    else await adminDeletePost(id, actorId, note);
  }
}
