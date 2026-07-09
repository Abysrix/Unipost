"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import { getPlatform, type PlatformId } from "@/config/platforms";
import { postInputSchema } from "@/lib/validations/post";
import type { PostInput } from "@/types/post";
import * as db from "@/lib/db/posts";

export type SaveResult = { id: string; updatedAt: string } | { error: string };

function cleanPlatforms(ids: string[]): PlatformId[] {
  return ids.filter((id): id is PlatformId => Boolean(getPlatform(id as PlatformId)));
}

/**
 * Create (id === null) or update a draft. Powers manual save + autosave.
 * Zod-validated; ownership enforced by RLS + an auth guard.
 */
export async function saveDraft(id: string | null, input: PostInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const clean: PostInput = { ...parsed.data, platforms: cleanPlatforms(parsed.data.platforms) };

  try {
    const post = id ? await db.updatePost(id, clean) : await db.insertDraft(clean);
    revalidatePath("/posts");
    return { id: post.id, updatedAt: post.updated_at };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save draft" };
  }
}

export async function deleteDraft(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  try {
    await db.softDeletePost(id);
    revalidatePath("/posts");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete" };
  }
}

export async function duplicateDraft(id: string): Promise<{ id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  try {
    const post = await db.duplicatePost(id);
    revalidatePath("/posts");
    return { id: post.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to duplicate" };
  }
}

export async function restoreDraft(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  try {
    await db.restorePost(id);
    revalidatePath("/posts");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to restore" };
  }
}

export async function permanentlyDeleteDraft(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  try {
    await db.hardDeletePost(id);
    revalidatePath("/posts");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete" };
  }
}
