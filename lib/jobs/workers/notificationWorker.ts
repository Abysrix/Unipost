import { sendEmail } from "@/lib/notifications/email";
import type { ClaimedJob } from "@/lib/jobs/queue";

/** Processes one `notification_delivery` job — the email send `notify()` (lib/notifications/service.ts) queues after writing the fast in-app row. */
export async function processNotificationDeliveryJob(job: ClaimedJob): Promise<Record<string, unknown>> {
  const payload = job.payload as { to?: string; subject?: string; body?: string };
  if (!payload.to || !payload.subject || !payload.body) throw new Error("notification_delivery job is missing to/subject/body");

  const result = await sendEmail({ to: payload.to, subject: payload.subject, body: payload.body });
  if (!result.ok) throw new Error(result.error ?? "Email send failed.");
  return { stub: Boolean(result.stub) };
}
