import { generateWeeklyReview } from "@/lib/ai/growthCoach";
import type { ClaimedJob } from "@/lib/jobs/queue";

/** Processes one `growth_report` job — the actual LLM call + persistence, off the `/coach` page's request path (see `lib/ai/growthCoach.ts`'s doc comment). */
export async function processGrowthReportJob(job: ClaimedJob): Promise<Record<string, unknown>> {
  const userId = job.user_id ?? (job.payload as { userId?: string }).userId;
  if (!userId) throw new Error("growth_report job is missing a userId");

  const report = await generateWeeklyReview(userId);
  return { generated: Boolean(report), reportId: report?.id ?? null };
}
