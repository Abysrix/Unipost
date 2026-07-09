import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { Post, PostInput } from "@/types/post";

/**
 * Data layer for `public.posts`. All queries run through the request-scoped
 * server client, so RLS enforces ownership — we never filter by user_id here
 * (defense in depth: RLS is the real guard). Server-only.
 */
const COLUMNS = "id,user_id,title,content,status,platforms,media,visibility,deleted_at,created_at,updated_at";

/** All non-deleted posts, any status — used to build Creator Intelligence stats. */
export async function listAllPosts(): Promise<Post[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("posts").select(COLUMNS).is("deleted_at", null).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export async function listDrafts(): Promise<Post[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(COLUMNS)
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export async function listTrash(): Promise<Post[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(COLUMNS)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("posts").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Post) ?? null;
}

export async function insertDraft(input: PostInput): Promise<Post> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: user.id, status: "draft", ...input })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as Post;
}

export async function updatePost(id: string, patch: Partial<PostInput>): Promise<Post> {
  const supabase = createClient();
  const { data, error } = await supabase.from("posts").update(patch).eq("id", id).select(COLUMNS).single();
  if (error) throw error;
  return data as unknown as Post;
}

export async function softDeletePost(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function restorePost(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function hardDeletePost(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

/** Duplicate a post as a fresh draft. Media is NOT copied (storage files belong
 *  to the original); the copy starts with an empty media set. */
export async function duplicatePost(id: string): Promise<Post> {
  const src = await getPost(id);
  if (!src) throw new Error("Post not found");
  return insertDraft({
    title: src.title ? `${src.title} (copy)` : "Untitled (copy)",
    content: src.content,
    platforms: src.platforms,
    media: [],
    visibility: src.visibility,
  });
}
