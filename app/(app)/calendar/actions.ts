"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import { scheduleInputSchema, rescheduleSchema } from "@/lib/validations/schedule";
import { MIN_LEAD_MS } from "@/lib/schedule/scheduling";
import type { PlatformId } from "@/config/platforms";
import type { ScheduleInput, ScheduledPost } from "@/types/schedule";
import * as db from "@/lib/db/schedule";

async function guard() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function revalidate() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/posts");
}

export type ScheduleResult = { scheduled: ScheduledPost[] } | { error: string };

export async function schedulePost(input: ScheduleInput): Promise<ScheduleResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const parsed = scheduleInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid schedule." };
  if (new Date(parsed.data.scheduledTime).getTime() < Date.now() + MIN_LEAD_MS) {
    return { error: "Pick a time at least a minute in the future." };
  }

  try {
    const created = await db.createSchedules({
      postId: parsed.data.postId,
      platforms: parsed.data.platforms as PlatformId[],
      scheduledTime: parsed.data.scheduledTime,
      timezone: parsed.data.timezone,
      priority: parsed.data.priority,
      durationMin: parsed.data.durationMin,
    });

    // Immediately upload to platforms that support native scheduling (YouTube, etc.)
    // so the video appears in the platform's studio as "Scheduled" right away.
    // Errors here are non-fatal — the schedule row exists and the cron will retry.
    const nativePlatforms = new Set(["youtube"]);
    const toUpload = created.filter((sp) => nativePlatforms.has(sp.platform));
    if (toUpload.length > 0) {
      // Fire-and-forget (best-effort) — we don't block the response on upload time
      Promise.all(toUpload.map((sp) => db.publishNow(sp.id))).catch(() => {
        /* non-fatal — cron will retry at scheduled_time */
      });
    }

    revalidate();
    return { scheduled: created };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to schedule." };
  }
}

export async function reschedulePost(input: { id: string; scheduledTime: string; timezone?: string; durationMin?: number }): Promise<{ error?: string }> {
  await guard();
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid time." };
  try {
    await db.reschedule(parsed.data.id, parsed.data.scheduledTime, parsed.data.timezone, parsed.data.durationMin);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reschedule." };
  }
}

export async function cancelScheduled(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.cancelSchedule(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to cancel." };
  }
}

export async function deleteScheduled(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.removeSchedule(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete." };
  }
}

export async function setSchedulePriority(id: string, priority: boolean): Promise<{ error?: string }> {
  await guard();
  try {
    await db.setPriority(id, priority);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update." };
  }
}

export async function retryScheduled(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.retrySchedule(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to retry." };
  }
}

export async function reorderScheduleQueue(orderedIds: string[]): Promise<{ error?: string }> {
  await guard();
  try {
    await db.reorderQueue(orderedIds);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reorder." };
  }
}

export async function duplicateScheduled(id: string): Promise<{ id?: string; error?: string }> {
  await guard();
  try {
    const created = await db.duplicateSchedule(id);
    revalidate();
    return { id: created?.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to duplicate." };
  }
}

export async function archiveScheduled(id: string): Promise<{ error?: string }> {
  await guard();
  try {
    await db.archiveSchedule(id);
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to archive." };
  }
}

export async function publishScheduledNow(id: string): Promise<{ ok?: boolean; error?: string }> {
  await guard();
  try {
    const res = await db.publishNow(id);
    revalidate();
    return res.ok ? { ok: true } : { error: res.error ?? "Publishing failed." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Publishing failed." };
  }
}
