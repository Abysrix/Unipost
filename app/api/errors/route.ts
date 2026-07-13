import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import { persistError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";

/**
 * POST /api/errors — the one path client-side code (React error boundaries)
 * can reach to persist a crash, since the browser can never hold a
 * service-role credential itself. Best-effort: never a hard failure for the
 * caller, since a boundary is already handling a real error and shouldn't
 * get a *second* one from the reporting call itself.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { message?: string; stack?: string; boundary?: string; digest?: string; url?: string };
    const user = await getCurrentUser().catch(() => null);
    await persistError({
      source: "client_error",
      error: new Error(typeof body.message === "string" ? body.message.slice(0, 2000) : "Unknown client error"),
      userId: user?.id,
      severity: "error",
      context: { boundary: body.boundary, digest: body.digest, url: body.url, stack: body.stack?.slice(0, 4000) },
    });
  } catch {
    /* best-effort — swallow, never surface a second error from error reporting itself */
  }
  return NextResponse.json({ ok: true });
}
