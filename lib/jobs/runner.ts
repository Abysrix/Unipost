import { claimJobs, completeJob, failJob, enqueueJob, type JobType, type ClaimedJob } from "@/lib/jobs/queue";
import { processGrowthReportJob } from "@/lib/jobs/workers/growthReportWorker";
import { processNotificationDeliveryJob } from "@/lib/jobs/workers/notificationWorker";
import { processCleanupJob } from "@/lib/jobs/workers/cleanupWorker";
import { withCorrelation } from "@/lib/monitoring/logger";
import { persistError } from "@/lib/monitoring/errorLog";
import { recordPerformanceSample } from "@/lib/monitoring/performance";

/**
 * The generic queue's dispatcher — claims due jobs of every known type and
 * routes each to its worker. One `job_type` → one function; adding a new
 * job type later means adding one case here and one worker file, nothing
 * about the queue/claim/retry machinery changes (Phase 1's "Future Jobs").
 */
const JOB_TYPES: JobType[] = ["growth_report", "notification_delivery", "cleanup"];
const CLEANUP_INTERVAL_HOURS = 24;

async function dispatch(job: ClaimedJob): Promise<Record<string, unknown>> {
  switch (job.job_type) {
    case "growth_report":
      return processGrowthReportJob(job);
    case "notification_delivery":
      return processNotificationDeliveryJob(job);
    case "cleanup":
      return processCleanupJob();
    default:
      throw new Error(`No worker registered for job type "${job.job_type}".`);
  }
}

/** Ensures a cleanup pass happens roughly once a day without a separate scheduling mechanism — deduped on a rounded timestamp so repeat cron invocations within the same window collapse to one job instead of piling up. */
async function ensureCleanupScheduled(): Promise<void> {
  const windowKey = Math.floor(Date.now() / (CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000));
  await enqueueJob("cleanup", { windowKey }, { dedupe: true, maxAttempts: 1 }).catch(() => {});
}

export interface RunnerSummary extends Record<string, unknown> {
  claimed: number;
  completed: number;
  failed: number;
}

/** `/api/cron/jobs`'s entrypoint — claim a bounded batch, run each, report a summary. Never throws: one job's failure is recorded on that job (`failJob`), not surfaced as the whole run failing. */
export async function processJobQueue(batchSize = 20): Promise<RunnerSummary> {
  await ensureCleanupScheduled();

  const jobs = await claimJobs(JOB_TYPES, batchSize);
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    // job.id doubles as the correlation id — every console line and every
    // job_logs row for this run can be grep'd/filtered together by it.
    const log = withCorrelation(job.id);
    const startedAt = Date.now();
    log.info(`Job started`, { jobType: job.job_type, attempt: job.attempts + 1 });

    try {
      const result = await dispatch(job);
      const durationMs = Date.now() - startedAt;
      await completeJob(job.id, { ...result, durationMs });
      log.info(`Job completed`, { jobType: job.job_type, durationMs });
      await recordPerformanceSample("worker_queue_time_ms", durationMs, { jobType: job.job_type }).catch(() => {});
      completed++;
    } catch (e) {
      const durationMs = Date.now() - startedAt;
      const message = e instanceof Error ? e.message : String(e);
      await failJob(job.id, message);
      log.error(e, { jobType: job.job_type, durationMs });
      await persistError({ source: "worker_failure", error: e, userId: job.user_id, context: { jobType: job.job_type, jobId: job.id, durationMs } }).catch(() => {});
      failed++;
    }
  }

  return { claimed: jobs.length, completed, failed };
}
