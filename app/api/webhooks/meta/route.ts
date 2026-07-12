import { NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/webhooks/verify";
import { logWebhookEvent, markWebhookProcessed } from "@/lib/webhooks/log";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/webhooks/meta — Instagram/Facebook/Threads webhook receiver
 * (Integration Sprint 6, Phase 4).
 *
 * GET handles Meta's subscription-verification handshake
 * (`hub.mode`/`hub.verify_token`/`hub.challenge`, checked against
 * `META_WEBHOOK_VERIFY_TOKEN`). POST handles real event delivery,
 * signature-verified via `X-Hub-Signature-256` (HMAC-SHA256 of the raw
 * body, keyed by the Meta App Secret — `META_APP_SECRET`, falling back to
 * the existing `FACEBOOK_CLIENT_SECRET` since Instagram/Facebook/Threads
 * share one Meta App in this project's OAuth config).
 *
 * Real, working receiver — signature verification and idempotency
 * (`webhook_events`' unique `(provider, payload_hash)` index) are both
 * genuine, not stubbed. What's deliberately not built yet: per-event-type
 * business logic (e.g. "a comment was posted, react to it") — Meta's
 * `entry[].changes[].field` shapes vary per subscribed field, and writing
 * handlers against documentation alone rather than real observed payloads
 * risks silently mishandling a field this app never actually receives
 * during development. Every real event still gets verified, logged, and
 * marked `processed` — the plumbing is complete; deep per-field handling
 * is the natural next increment once a real subscription exists to
 * validate against. Nothing calls this endpoint at all until a webhook
 * subscription is registered in the Meta App Dashboard, which needs a
 * public HTTPS URL (and, for some fields, app review) — outside what this
 * environment can do, same "engine is real, platform-side connection needs
 * real configuration" position as every OAuth/publishing/analytics
 * provider in this project.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{ id?: string; time?: number; changes?: unknown[]; messaging?: unknown[] }>;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;

  const signatureValid = Boolean(appSecret) && verifyMetaSignature(rawBody, signatureHeader, appSecret as string);
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const log = await logWebhookEvent("meta", rawBody, payload.object ?? "unknown", signatureValid, payload);
  if (log.isDuplicate) {
    // Meta retries on non-2xx — 200 here tells it this delivery is already handled, not "please retry."
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    // Per-field business logic plugs in here once a real subscription exists — see doc comment above.
    if (log.eventId) await markWebhookProcessed(log.eventId, "processed");
  } catch (e) {
    if (log.eventId) await markWebhookProcessed(log.eventId, "failed", e instanceof Error ? e.message : String(e));
    logger.error(e, { source: "meta_webhook" });
  }

  return NextResponse.json({ ok: true });
}
