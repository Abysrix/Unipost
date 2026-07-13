import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight performance sampling (LaunchOps Phase 2) — one flexible sink
 * specific code paths write a duration to when they already have one in
 * hand (a job's own start/end, a publish attempt, an analytics sync run),
 * rather than instrumenting every API route/DB call with a custom APM
 * layer. AI response time and job/cron duration already have a real home
 * (ai_generations.duration_ms, job_logs, cron_history) — this exists for
 * the handful of durations that don't.
 */
export async function recordPerformanceSample(metric: string, valueMs: number, context: Record<string, unknown> = {}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("performance_samples").insert({ metric, value_ms: Math.max(0, Math.round(valueMs)), context });
  } catch {
    /* best-effort — a missed performance sample must never break the real work it's measuring */
  }
}
