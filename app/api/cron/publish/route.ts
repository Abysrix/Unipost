import { NextResponse } from "next/server";
import { processScheduledQueue } from "@/lib/db/admin/scheduler";
import { withCronHistory } from "@/lib/jobs/cronRun";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/publish — Background worker endpoint.
 * Called by Vercel Cron or a custom timer to process due posts.
 * Secured by CRON_SECRET token.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bypass = searchParams.get("bypass") === "true" && process.env.NODE_ENV === "development";

  // Security gate: verify cron authorization. Fails CLOSED — an unset
  // CRON_SECRET must reject every non-bypass request, not silently accept
  // them; `bypass` itself is already gated to NODE_ENV==="development" above,
  // so this never opens the endpoint in production regardless of config.
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!bypass && (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await withCronHistory("publish", processScheduledQueue);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Queue execution failed";
    logger.error(err, { source: "cron_scheduler" });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/cron/publish — Allows triggering via POST requests.
 */
export async function POST(req: Request) {
  return GET(req);
}
