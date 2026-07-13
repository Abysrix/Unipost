import { NextResponse } from "next/server";
import { processJobQueue } from "@/lib/jobs/runner";
import { withCronHistory } from "@/lib/jobs/cronRun";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/jobs — the generic job queue's worker endpoint (Integration
 * Sprint 6). Claims and processes due `jobs` rows (AI report generation,
 * notification email delivery, retention cleanup) — same `CRON_SECRET`
 * bearer-auth + `?bypass=true` dev escape hatch as `/api/cron/publish`/
 * `/api/cron/analytics`.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bypass = searchParams.get("bypass") === "true" && process.env.NODE_ENV === "development";

  // Fails CLOSED — an unset CRON_SECRET must reject every non-bypass request,
  // not silently accept them; `bypass` is already gated to
  // NODE_ENV==="development" above, so this never opens the endpoint in production.
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!bypass && (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await withCronHistory("jobs", () => processJobQueue());
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Job queue execution failed";
    logger.error(err, { source: "cron_jobs" });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/cron/jobs — allows triggering via POST requests.
 */
export async function POST(req: Request) {
  return GET(req);
}
