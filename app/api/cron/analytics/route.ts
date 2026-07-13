import { NextResponse } from "next/server";
import { processAnalyticsSyncQueue } from "@/lib/db/admin/analyticsScheduler";
import { withCronHistory } from "@/lib/jobs/cronRun";
import { logger } from "@/lib/monitoring/logger";
import { persistError } from "@/lib/monitoring/errorLog";
import { recordPerformanceSample } from "@/lib/monitoring/performance";

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

  // Fails CLOSED — an unset CRON_SECRET must reject every non-bypass request,
  // not silently accept them; `bypass` is already gated to
  // NODE_ENV==="development" above, so this never opens the endpoint in production.
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!bypass && (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const summary = await withCronHistory("analytics", processAnalyticsSyncQueue);
    await recordPerformanceSample("analytics_sync_cron_duration_ms", Date.now() - startedAt, summary).catch(() => {});
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analytics sync queue execution failed";
    logger.error(err, { source: "cron_analytics" });
    await persistError({ source: "analytics_failure", error: err, context: { route: "/api/cron/analytics", durationMs: Date.now() - startedAt } }).catch(() => {});
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/cron/analytics — Allows triggering via POST requests.
 */
export async function POST(req: Request) {
  return GET(req);
}
