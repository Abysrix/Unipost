import { NextResponse } from "next/server";
import { verifyXSignature, xCrcResponseToken } from "@/lib/webhooks/verify";
import { logWebhookEvent, markWebhookProcessed } from "@/lib/webhooks/log";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/webhooks/x — X (Twitter) Account Activity API webhook receiver
 * (Integration Sprint 6, Phase 4).
 *
 * Real, structural limitation, documented rather than papered over (same
 * honesty this project applied to LinkedIn's analytics gap in Integration
 * Sprint 5): X's Account Activity webhook product authenticates with an
 * OAuth **1.0a** Consumer Key/Secret — a genuinely different credential
 * pair from the OAuth **2.0** `X_CLIENT_ID`/`X_CLIENT_SECRET` this project
 * already has configured for publishing/analytics (Integration Sprints 3–4).
 * Enabling this endpoint for real needs a *separate* OAuth 1.0a app
 * registration in the X Developer Portal — `X_WEBHOOK_CONSUMER_SECRET` is
 * intentionally its own env var, not a reuse of `X_CLIENT_SECRET`.
 *
 * GET handles the required CRC (Challenge-Response Check) X performs
 * periodically to keep a webhook subscription alive — `crc_token` query
 * param, HMAC-SHA256-signed with the Consumer Secret, base64, returned as
 * `{response_token: "sha256=..."}`. POST handles real event delivery,
 * signature-verified via `x-twitter-webhooks-signature`. Same "verify +
 * idempotency-log + defer per-event-type handling until real payloads
 * exist to build against" posture as the Meta receiver.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crcToken = searchParams.get("crc_token");
  const consumerSecret = process.env.X_WEBHOOK_CONSUMER_SECRET;

  if (!crcToken || !consumerSecret) {
    return NextResponse.json({ error: "Missing crc_token or X_WEBHOOK_CONSUMER_SECRET not configured" }, { status: 400 });
  }
  return NextResponse.json({ response_token: xCrcResponseToken(crcToken, consumerSecret) });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-twitter-webhooks-signature");
  const consumerSecret = process.env.X_WEBHOOK_CONSUMER_SECRET;

  const signatureValid = Boolean(consumerSecret) && verifyXSignature(rawBody, signatureHeader, consumerSecret as string);
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const eventType = Object.keys(payload).find((k) => k.endsWith("_events")) ?? "unknown";
  const log = await logWebhookEvent("x", rawBody, eventType, signatureValid, payload);
  if (log.isDuplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    // Per-event-type business logic plugs in here once a real subscription exists — see doc comment above.
    if (log.eventId) await markWebhookProcessed(log.eventId, "processed");
  } catch (e) {
    if (log.eventId) await markWebhookProcessed(log.eventId, "failed", e instanceof Error ? e.message : String(e));
    logger.error(e, { source: "x_webhook" });
  }

  return NextResponse.json({ ok: true });
}
