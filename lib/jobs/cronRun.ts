import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Wraps any cron handler with a `cron_history` row — the real "worker
 * status" (Phase 1's DoD, consolidated per this migration's own doc
 * comment rather than a separate table). Used by the new `/api/cron/jobs`
 * *and* retrofitted onto the two existing cron routes
 * (`/api/cron/publish`, `/api/cron/analytics`) without touching their
 * actual business logic — this only wraps the call, it doesn't change what
 * `processScheduledQueue()`/`processAnalyticsSyncQueue()` do.
 */
export async function withCronHistory<T extends Record<string, unknown>>(cronName: string, fn: () => Promise<T>): Promise<T> {
  const admin = createAdminClient();
  const { data } = await admin.from("cron_history").insert({ cron_name: cronName, status: "running" }).select("id").single();
  const runId = (data as { id: string } | null)?.id;

  try {
    const result = await fn();
    if (runId) {
      await admin.from("cron_history").update({ status: "completed", finished_at: new Date().toISOString(), summary: result }).eq("id", runId);
    }
    return result;
  } catch (e) {
    if (runId) {
      await admin.from("cron_history").update({ status: "failed", finished_at: new Date().toISOString(), error: e instanceof Error ? e.message : String(e) }).eq("id", runId);
    }
    throw e;
  }
}
