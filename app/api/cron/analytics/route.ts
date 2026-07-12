import { NextResponse } from "next/server";
import { processAnalyticsSyncQueue } from "@/lib/db/admin/analyticsScheduler";
import { withCronHistory } from "@/lib/jobs/cronRun";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/analytics — Background worker endpoint.
 * Called by Vercel Cron or a custom timer to refresh every connected
 * account's analytics on a schedule. Secured by CRON_SECRET, same shape as
 * /api/cron/publish (Integration Sprint 3).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bypass = searchParams.get("bypass") === "true" && process.env.NODE_ENV === "development";

  const authHeader = req.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && !bypass) {
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const summary = await withCronHistory("analytics", processAnalyticsSyncQueue);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analytics sync queue execution failed";
    logger.error(err, { source: "cron_analytics" });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/cron/analytics — Allows triggering via POST requests.
 */
export async function POST(req: Request) {
  return GET(req);
}
