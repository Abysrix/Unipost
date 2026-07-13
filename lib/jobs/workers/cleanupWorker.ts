import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retention cleanup — Phase 1's "Cleanup Jobs," Phase 9's "Retention
 * Strategy." Purges what's genuinely disposable: expired context-cache
 * rows (useless the moment they expire — `lib/ai/context.ts` never reads a
 * stale one anyway), and old operational logs that exist for
 * recent-history debugging, not permanent audit (unlike `audit_logs`,
 * which this job never touches). Real deletes, real counts — not a
 * simulated cleanup.
 */

const JOB_LOG_RETENTION_DAYS = 30;
const CRON_HISTORY_RETENTION_DAYS = 30;
const READ_NOTIFICATION_RETENTION_DAYS = 90;
// A fixed-window bucket is dead the instant its window closes (check_rate_limit
// only ever touches the *current* window_start) — 1 day is just a conservative,
// single retention constant so this job doesn't need to know every caller's
// window_seconds to know a row is safe to drop.
const RATE_LIMIT_RETENTION_DAYS = 1;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function processCleanupJob(): Promise<Record<string, unknown>> {
  const admin = createAdminClient();

  const [expiredContext, oldJobLogs, oldCronHistory, oldNotifications, oldRateLimits] = await Promise.all([
    admin.from("ai_context_cache").delete().lt("expires_at", new Date().toISOString()).select("user_id"),
    admin.from("job_logs").delete().lt("created_at", daysAgoIso(JOB_LOG_RETENTION_DAYS)).select("id"),
    admin.from("cron_history").delete().lt("created_at", daysAgoIso(CRON_HISTORY_RETENTION_DAYS)).select("id"),
    admin.from("notifications").delete().not("read_at", "is", null).lt("read_at", daysAgoIso(READ_NOTIFICATION_RETENTION_DAYS)).select("id"),
    admin.from("rate_limits").delete().lt("window_start", daysAgoIso(RATE_LIMIT_RETENTION_DAYS)).select("bucket_key"),
  ]);

  return {
    expiredContextRemoved: expiredContext.data?.length ?? 0,
    oldJobLogsRemoved: oldJobLogs.data?.length ?? 0,
    oldCronHistoryRemoved: oldCronHistory.data?.length ?? 0,
    oldNotificationsRemoved: oldNotifications.data?.length ?? 0,
    oldRateLimitsRemoved: oldRateLimits.data?.length ?? 0,
  };
}
