"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import { goalInputSchema } from "@/lib/validations/growth";
import type { PlatformId } from "@/config/platforms";
import type { GoalInput } from "@/types/growth";
import * as db from "@/lib/db/growth";

async function guard() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function revalidate() {
  revalidatePath("/score");
  revalidatePath("/analytics");
  revalidatePath("/coach");
  revalidatePath("/dashboard");
}

/* ── Goals ── */
export type CreateGoalResult = { id: string } | { error: string };

export async function createGoalAction(input: GoalInput): Promise<CreateGoalResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired — please sign in again." };
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid goal." };
  try {
    const goal = await db.createGoal({ ...parsed.data, platform: parsed.data.platform as PlatformId | null | undefined });
    revalidate();
    return { id: goal.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create goal." };
  }
}

export async function archiveGoalAction(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.setGoalStatus(id, "archived");
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to archive goal." };
  }
}

export async function deleteGoalAction(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.deleteGoal(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete goal." };
  }
}

/* ── Growth recommendations ── */
export async function dismissRecommendation(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.setRecommendationStatus(id, "dismissed");
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to dismiss." };
  }
}

export async function completeRecommendation(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.setRecommendationStatus(id, "completed");
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update." };
  }
}
