import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generic job queue — Integration Sprint 6, Phase 1. Any async work that
 * doesn't already have its own state machine enqueues here: AI report
 * generation, notification delivery, cleanup, and whatever future job type
 * shows up next without needing its own migration. Publishing
 * (`scheduled_posts`) and analytics sync (`connected_accounts` due-check)
 * deliberately keep their own existing, already-hardened claim-lock +
 * retry logic rather than being rebuilt on top of this table — see this
 * sprint's PROJECT_STATUS.md entry for why ("never replace working
 * systems," and duplicating two state machines that already work would be
 * exactly the "duplicate business logic" this sprint's brief rules out).
 * Their cron runs DO log a `cron_history` row here for unified visibility
 * (see `lib/jobs/cronRun.ts`) — observability is unified even though
 * execution isn't.
 */

export type JobType = "growth_report" | "notification_delivery" | "cleanup";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "retrying" | "cancelled";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ClaimedJob {
  id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  user_id: string | null;
}

export interface EnqueueOptions {
  userId?: string;
  maxAttempts?: number;
  priority?: number;
  runAfter?: Date;
  /** Skip enqueueing if an identical (same type + payload) job is already queued/running/retrying — cheap protection against a caller accidentally double-scheduling the same work. */
  dedupe?: boolean;
}

function hashPayload(payload: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function enqueueJob(jobType: JobType, payload: Record<string, unknown>, opts: EnqueueOptions = {}): Promise<string> {
  const admin = createAdminClient();
  const payloadHash = hashPayload(payload);

  if (opts.dedupe) {
    const { data: existing } = await admin.from("jobs").select("id").eq("job_type", jobType).eq("payload_hash", payloadHash).in("status", ["queued", "running", "retrying"]).maybeSingle();
    if (existing) return (existing as { id: string }).id;
  }

  const { data, error } = await admin
    .from("jobs")
    .insert({
      job_type: jobType,
      payload,
      payload_hash: payloadHash,
      user_id: opts.userId ?? null,
      max_attempts: opts.maxAttempts ?? 3,
      priority: opts.priority ?? 0,
      run_after: (opts.runAfter ?? new Date()).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Atomically claim up to `limit` due jobs of the given types. Same
 * conditional-UPDATE claim-lock principle as `publishNow`/
 * `processScheduledQueue` (Integration Sprint 3) — the `.in("status", [...])`
 * on the UPDATE itself (not just the earlier SELECT) means a row already
 * claimed by a concurrent worker between the two queries simply won't match
 * anymore and silently drops out of the result, in one round trip rather
 * than a claim-per-row loop.
 */
export async function claimJobs(jobTypes: JobType[], limit = 10): Promise<ClaimedJob[]> {
  const admin = createAdminClient();
  const { data: due } = await admin
    .from("jobs")
    .select("id")
    .in("job_type", jobTypes)
    .in("status", ["queued", "retrying"])
    .lte("run_after", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  const ids = (due ?? []).map((r) => (r as { id: string }).id);
  if (ids.length === 0) return [];

  const { data: claimed } = await admin
    .from("jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .in("id", ids)
    .in("status", ["queued", "retrying"])
    .select("id,job_type,payload,attempts,max_attempts,user_id");

  return (claimed ?? []) as unknown as ClaimedJob[];
}

export async function completeJob(id: string, summary?: Record<string, unknown>): Promise<void> {
  const admin = createAdminClient();
  await admin.from("jobs").update({ status: "completed", completed_at: new Date().toISOString(), error: null }).eq("id", id);
  await logJob(id, "info", "Job completed", summary ?? {});
}

/** Increments `attempts`; moves to `retrying` if under `max_attempts`, otherwise `failed` — the dead-letter state, queryable directly as `jobs where status = 'failed'`. */
export async function failJob(id: string, error: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("jobs").select("attempts,max_attempts").eq("id", id).maybeSingle();
  const row = data as { attempts: number; max_attempts: number } | null;
  const attempts = (row?.attempts ?? 0) + 1;
  const exhausted = !row || attempts >= row.max_attempts;
  await admin.from("jobs").update({ status: exhausted ? "failed" : "retrying", attempts, error }).eq("id", id);
  await logJob(id, "error", error);
}

export async function cancelJob(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("jobs").update({ status: "cancelled" }).eq("id", id).in("status", ["queued", "retrying"]);
}

export async function logJob(jobId: string, level: LogLevel, message: string, meta: Record<string, unknown> = {}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("job_logs").insert({ job_id: jobId, level, message, meta });
}

/** Queue depth per type/status — the cheap DB read `lib/admin/health-checks.ts` uses for real (not config-presence) queue monitoring. */
export async function queueDepth(): Promise<{ job_type: string; status: JobStatus; count: number }[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("jobs").select("job_type,status").in("status", ["queued", "retrying", "running", "failed"]);
  const rows = (data ?? []) as { job_type: string; status: JobStatus }[];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.job_type}:${r.status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([key, count]) => {
    const [job_type, status] = key.split(":");
    return { job_type, status: status as JobStatus, count };
  });
}
