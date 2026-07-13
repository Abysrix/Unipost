import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { PlatformId } from "@/config/platforms";
import type { ScheduledEvent, ScheduledPost, ScheduleStatus } from "@/types/schedule";
import { publishScheduledPost, NON_RETRYABLE_ERRORS } from "@/lib/schedule/publishing";
import { getDefaultAccountId } from "@/lib/db/integrations";
import { awardXp } from "@/lib/db/xp";
import { getCurrentPlan } from "@/lib/db/plan";
import { planLimits } from "@/lib/billing/plans";
import { invalidateCreatorContext } from "@/lib/ai/contextCache";

/** Server-only scheduling data layer. RLS enforces per-user ownership. */

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const SP_COLS =
  "id,user_id,post_id,platform,connected_account_id,scheduled_time,timezone,duration_min,status,priority,position,retry_count,max_retries,error,platform_post_id,published_at,created_at,updated_at";
const EVENT_SELECT = `${SP_COLS}, post:posts(id,title,content,media,visibility)`;

/* ── Reads ── */
export async function listEvents(fromIso?: string, toIso?: string): Promise<ScheduledEvent[]> {
  const supabase = createClient();
  let q = supabase.from("scheduled_posts").select(EVENT_SELECT).order("scheduled_time", { ascending: true });
  if (fromIso) q = q.gte("scheduled_time", fromIso);
  if (toIso) q = q.lte("scheduled_time", toIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ScheduledEvent[];
}

export async function getEvent(id: string): Promise<ScheduledEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("scheduled_posts").select(EVENT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as ScheduledEvent) ?? null;
}


/* ── Internal helpers ── */
async function log(
  userId: string,
  sp: { id: string; post_id: string; platform: string },
  status: string,
  message?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  // publishing_logs is a system-computed audit trail (migration 0017) — admin
  // client, same reasoning as every other write-lockdown this Integration
  // Phase has applied. userId is always the caller's own uid() (never
  // user-suppliable), so this doesn't widen who can write, only stops a
  // direct client call from forging a fake publish history.
  const admin = createAdminClient();
  await admin.from("publishing_logs").insert({
    user_id: userId,
    scheduled_post_id: sp.id,
    post_id: sp.post_id,
    platform: sp.platform,
    status,
    message: message ?? null,
    metadata: metadata ?? {},
  });
}

/** Recompute the parent post's status from its schedules. */
async function syncPostStatus(postId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.from("scheduled_posts").select("status").eq("post_id", postId);
  const rows = (data ?? []) as { status: ScheduleStatus }[];
  let next: string;
  if (rows.length === 0) next = "draft";
  else if (rows.every((r) => r.status === "published")) next = "published";
  else if (rows.some((r) => ["scheduled", "queued", "publishing", "failed"].includes(r.status))) next = "scheduled";
  else next = "draft";
  // Never override a manually archived post.
  await supabase.from("posts").update({ status: next }).eq("id", postId).neq("status", "archived");
}

async function nextPositions(userId: string, platforms: PlatformId[]): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase.from("scheduled_posts").select("platform,position").eq("user_id", userId).in("platform", platforms);
  const max: Record<string, number> = {};
  for (const row of (data ?? []) as { platform: string; position: number }[]) {
    max[row.platform] = Math.max(max[row.platform] ?? -1, row.position);
  }
  const next: Record<string, number> = {};
  for (const p of platforms) next[p] = (max[p] ?? -1) + 1;
  return next;
}

/* ── Writes ── */
export async function createSchedules(input: {
  postId: string;
  platforms: PlatformId[];
  scheduledTime: string;
  timezone: string;
  priority?: boolean;
  durationMin?: number;
}): Promise<ScheduledPost[]> {
  const userId = await uid();
  const supabase = createClient();

  const plan = await getCurrentPlan();
  const limit = planLimits(plan).maxScheduledPosts;
  if (Number.isFinite(limit)) {
    const { count } = await supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["scheduled", "queued", "publishing"]);
    if ((count ?? 0) + input.platforms.length > limit) {
      throw new Error(`You've reached your ${planLimits(plan).name} plan's limit of ${limit} scheduled posts. Upgrade to schedule more.`);
    }
  }

  const positions = await nextPositions(userId, input.platforms);
  // Snapshot each platform's default connected account now — re-resolved
  // again at publish time regardless (the user may reconnect or switch
  // their default in between), but storing it up front means the queue can
  // show which account a schedule will publish through before that moment.
  const accountIds = await Promise.all(input.platforms.map((platform) => getDefaultAccountId(platform, userId)));
  const rows = input.platforms.map((platform, i) => ({
    user_id: userId,
    post_id: input.postId,
    platform,
    connected_account_id: accountIds[i],
    scheduled_time: input.scheduledTime,
    timezone: input.timezone,
    duration_min: input.durationMin ?? 30,
    priority: input.priority ?? false,
    position: positions[platform],
    status: "scheduled" as const,
  }));
  const { data, error } = await supabase.from("scheduled_posts").insert(rows).select(SP_COLS);
  if (error) throw error;
  const created = (data ?? []) as unknown as ScheduledPost[];
  await Promise.all(created.map((sp) => log(userId, sp, "scheduled", "Scheduled")));
  await syncPostStatus(input.postId);
  try {
    await Promise.all(created.map((sp) => awardXp("post_scheduled_ahead", `scheduled_ahead:${sp.id}`)));
  } catch {
    /* XP is best-effort; scheduling already succeeded */
  }
  return created;
}

export async function reschedule(id: string, scheduledTime: string, timezone?: string, durationMin?: number): Promise<void> {
  const userId = await uid();
  const supabase = createClient();
  const patch: Record<string, unknown> = { scheduled_time: scheduledTime, status: "scheduled", error: null };
  if (timezone) patch.timezone = timezone;
  if (durationMin) patch.duration_min = durationMin;
  const { data, error } = await supabase.from("scheduled_posts").update(patch).eq("id", id).select("id,post_id,platform").single();
  if (error) throw error;
  const sp = data as { id: string; post_id: string; platform: string };
  await log(userId, sp, "scheduled", `Rescheduled to ${scheduledTime}`);
  await syncPostStatus(sp.post_id);
}

export async function setPriority(id: string, priority: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_posts").update({ priority }).eq("id", id);
  if (error) throw error;
}

export async function cancelSchedule(id: string): Promise<void> {
  const userId = await uid();
  const supabase = createClient();
  const { data, error } = await supabase.from("scheduled_posts").update({ status: "canceled" }).eq("id", id).select("id,post_id,platform").single();
  if (error) throw error;
  const sp = data as { id: string; post_id: string; platform: string };
  await log(userId, sp, "canceled", "Canceled");
  await syncPostStatus(sp.post_id);
}

export async function removeSchedule(id: string): Promise<void> {
  const supabase = createClient();
  const { data: existing } = await supabase.from("scheduled_posts").select("post_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) throw error;
  if (existing) await syncPostStatus((existing as { post_id: string }).post_id);
}

export async function retrySchedule(id: string): Promise<void> {
  const userId = await uid();
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase.from("scheduled_posts").select("retry_count,max_retries").eq("id", id).maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Schedule not found.");
  const { retry_count, max_retries } = existing as { retry_count: number; max_retries: number };
  if (retry_count >= max_retries) {
    throw new Error(`Retry limit reached (${retry_count}/${max_retries}). Edit and reschedule this post instead.`);
  }

  // Guard on status="failed" the same way publishNow's own claim-lock guards
  // its transition — retry_count/max_retries above were read fresh, but
  // without this the write itself doesn't re-verify the row is still
  // "failed": a stale client (this row published or started publishing in
  // the background between that read and this write) could otherwise revert
  // an already-published row back to "queued", which cron would then
  // legitimately re-claim and publish a second time for real.
  const { data, error } = await supabase.from("scheduled_posts").update({ status: "queued", error: null }).eq("id", id).eq("status", "failed").select("id,post_id,platform").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This post is no longer in a failed state — refresh and try again.");
  const sp = data as { id: string; post_id: string; platform: string };
  await log(userId, sp, "queued", "Re-queued for retry");
}

export async function reorderQueue(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  // Persist new positions. RLS scopes each update to the caller's rows.
  await Promise.all(orderedIds.map((id, i) => supabase.from("scheduled_posts").update({ position: i }).eq("id", id)));
}

export async function duplicateSchedule(id: string): Promise<ScheduledPost | null> {
  const src = await getEvent(id);
  if (!src) return null;
  const nextTime = new Date(new Date(src.scheduled_time).getTime() + 86_400_000).toISOString();
  const [created] = await createSchedules({
    postId: src.post_id,
    platforms: [src.platform],
    scheduledTime: nextTime,
    timezone: src.timezone,
    priority: src.priority,
    durationMin: src.duration_min,
  });
  return created ?? null;
}

/** Archive: cancel this schedule and mark the parent post archived. */
export async function archiveSchedule(id: string): Promise<void> {
  const userId = await uid();
  const supabase = createClient();
  const { data, error } = await supabase.from("scheduled_posts").update({ status: "canceled" }).eq("id", id).select("id,post_id,platform").single();
  if (error) throw error;
  const sp = data as { id: string; post_id: string; platform: string };
  await log(userId, sp, "archived", "Archived");
  await supabase.from("posts").update({ status: "archived" }).eq("id", sp.post_id);
}

/**
 * Publish immediately through the publishing service (real provider adapter
 * when one's registered and the connection is genuine, deterministic stub
 * otherwise). Drives the scheduled → publishing → published|failed
 * transition with logging + retry.
 */
export async function publishNow(id: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await uid();
  const supabase = createClient();

  const existing = await getEvent(id);
  if (!existing) return { ok: false, error: "Schedule not found." };
  if (existing.status === "failed" && existing.retry_count >= existing.max_retries) {
    return { ok: false, error: `Retry limit reached (${existing.retry_count}/${existing.max_retries}). Edit and reschedule this post instead.` };
  }

  // Atomic claim: the conditional UPDATE only matches a row still in a
  // publishable status, so two concurrent triggers — a double click, or the
  // background cron worker (lib/db/admin/scheduler.ts) racing a manual
  // "Publish now" — can't both pass and both fire a real platform API call.
  const { data: claimed, error: claimError } = await supabase
    .from("scheduled_posts")
    .update({ status: "publishing" })
    .eq("id", id)
    .in("status", ["scheduled", "queued", "failed"])
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { ok: false, error: "This post is already publishing or has already been published." };

  const sp: ScheduledEvent = { ...existing, status: "publishing" };
  await log(userId, sp, "publishing", "Publishing…");

  const result = await publishScheduledPost(sp);

  if (result.ok) {
    // The platform publish already happened — a failure to persist that here
    // must not be swallowed, or the row is left stuck at "publishing" forever
    // (live on the platform, invisible to retry, no failure notification).
    const { error: publishedError } = await supabase.from("scheduled_posts").update({
      status: "published",
      published_at: new Date().toISOString(),
      platform_post_id: result.externalId ?? null,
      error: null,
    }).eq("id", id);
    if (publishedError) {
      await log(userId, sp, "failed", `Published on ${sp.platform} but failed to record it: ${publishedError.message}`, { platformPostId: result.externalId });
      return { ok: false, error: `Published, but failed to save the result — refresh and check ${sp.platform} directly.` };
    }
    await log(userId, sp, "published", result.externalId ? `Published (${result.externalId})` : "Published", result.responseMeta);
    await syncPostStatus(sp.post_id);
    try {
      await awardXp("post_published", `scheduled_post:${sp.id}`);
    } catch {
      /* XP is best-effort; publishing already succeeded */
    }
    await invalidateCreatorContext(userId).catch(() => {});
    return { ok: true };
  }

  // A non-retryable error (no connection, expired token, oversized media, ...)
  // describes a state a blind retry can't fix — jump straight to the retry
  // limit instead of burning it down one doomed attempt at a time, so the
  // user is told to reconnect/fix the post immediately rather than after
  // max_retries identical failures.
  const nonRetryable = result.errorCode ? NON_RETRYABLE_ERRORS.has(result.errorCode) : false;
  const nextRetryCount = nonRetryable ? Math.max(sp.retry_count + 1, sp.max_retries) : sp.retry_count + 1;
  const { error: failedError } = await supabase.from("scheduled_posts").update({ status: "failed", error: result.error ?? "Publishing failed", retry_count: nextRetryCount }).eq("id", id);
  if (failedError) await log(userId, sp, "failed", `Publish failed, and failed to record the failure: ${failedError.message}`, { errorCode: result.errorCode });
  else await log(userId, sp, "failed", result.error, { errorCode: result.errorCode, ...(result.responseMeta ?? {}) });
  return { ok: false, error: result.error };
}
