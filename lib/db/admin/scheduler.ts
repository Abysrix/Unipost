import { createAdminClient } from "@/lib/supabase/admin";
import { publishScheduledPost } from "@/lib/schedule/publishing";
import { adminAwardXp } from "@/lib/db/xp";
import type { ScheduledEvent, ScheduleStatus } from "@/types/schedule";

async function logPublishing(admin: any, userId: string, sp: { id: string; post_id: string; platform: string }, status: string, message?: string): Promise<void> {
  await admin.from("publishing_logs").insert({
    user_id: userId,
    scheduled_post_id: sp.id,
    post_id: sp.post_id,
    platform: sp.platform,
    status,
    message: message ?? null,
  });
}

async function syncPostStatusAdmin(admin: any, postId: string): Promise<void> {
  const { data } = await admin.from("scheduled_posts").select("status").eq("post_id", postId);
  const rows = (data ?? []) as { status: ScheduleStatus }[];
  let next: string;
  if (rows.length === 0) next = "draft";
  else if (rows.every((r) => r.status === "published")) next = "published";
  else if (rows.some((r) => ["scheduled", "queued", "publishing", "failed"].includes(r.status))) next = "scheduled";
  else next = "draft";
  
  await admin.from("posts").update({ status: next }).eq("id", postId).neq("status", "archived");
}

export async function processScheduledQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Fetch candidate posts that are due (scheduled_time <= now) and in scheduled, queued, or failed states
  const { data, error } = await admin
    .from("scheduled_posts")
    .select("id,user_id,post_id,platform,scheduled_time,timezone,duration_min,status,priority,position,retry_count,max_retries,error,published_at,created_at,updated_at, post:posts(id,title,content,media)")
    .lte("scheduled_time", now)
    .in("status", ["scheduled", "queued", "failed"]);

  if (error) throw error;

  const due = (data ?? []) as unknown as ScheduledEvent[];
  
  // Filter retry eligible failures in memory
  const eligible = due.filter(
    (sp) => sp.status !== "failed" || sp.retry_count < sp.max_retries
  );

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const sp of eligible) {
    processed++;
    try {
      // Transition state to publishing
      await admin.from("scheduled_posts").update({ status: "publishing" }).eq("id", sp.id);
      await logPublishing(admin, sp.user_id, sp, "publishing", "Publishing via background worker…");

      const result = await publishScheduledPost(sp);

      if (result.ok) {
        succeeded++;
        await admin.from("scheduled_posts").update({ 
          status: "published", 
          published_at: new Date().toISOString(), 
          platform_post_id: result.externalId ?? null,
          error: null 
        }).eq("id", sp.id);
        await logPublishing(admin, sp.user_id, sp, "published", result.externalId ? `Published (${result.externalId})` : "Published");
        await syncPostStatusAdmin(admin, sp.post_id);
        
        try {
          // Award XP to the creator of the post
          await adminAwardXp(sp.user_id, "post_published", `scheduled_post:${sp.id}`);
        } catch {
          /* XP is best-effort */
        }
      } else {
        failed++;
        await admin.from("scheduled_posts").update({ status: "failed", error: result.error ?? "Publishing failed", retry_count: sp.retry_count + 1 }).eq("id", sp.id);
        await logPublishing(admin, sp.user_id, sp, "failed", result.error);
        await syncPostStatusAdmin(admin, sp.post_id);
      }
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : "Internal worker error";
      await admin.from("scheduled_posts").update({ status: "failed", error: errMsg, retry_count: sp.retry_count + 1 }).eq("id", sp.id);
      await logPublishing(admin, sp.user_id, sp, "failed", errMsg);
      await syncPostStatusAdmin(admin, sp.post_id);
    }
  }

  return { processed, succeeded, failed };
}
