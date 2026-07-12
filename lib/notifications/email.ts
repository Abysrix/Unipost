import { logger } from "@/lib/monitoring/logger";

/**
 * Email delivery — real via Resend's REST API (a simple, SDK-free
 * transactional email API, matching this project's established "REST via
 * fetch, no SDK" style already used for the AI provider) when
 * `RESEND_API_KEY` is configured; a logged, non-blocking stub otherwise —
 * the same "real if configured, honest stub otherwise" pattern every prior
 * sprint has used for its own external dependency (Razorpay, OAuth,
 * publishing, analytics).
 */

export interface EmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface EmailResult {
  ok: boolean;
  error?: string;
  /** True when nothing was actually sent — no provider configured. */
  stub?: boolean;
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info("Email not sent — RESEND_API_KEY not configured, logging only.", { to: input.to, subject: input.subject });
    return { ok: true, stub: true };
  }

  const from = process.env.NOTIFICATIONS_FROM_EMAIL || "UniPost <notifications@unipost.bharvix.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.body }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Email provider returned ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reach the email provider." };
  }
}
