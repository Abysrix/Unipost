import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";
import { adminFindPaymentByOrderId, adminConfirmPayment, adminMarkPaymentFailed } from "@/lib/db/billing";
import { logWebhookEvent, markWebhookProcessed } from "@/lib/webhooks/log";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; error_description?: string } };
  };
}

/**
 * POST /api/webhooks/razorpay — real Razorpay servers call this for
 * `payment.captured` / `payment.failed` / `subscription.*` events. Verified
 * against `RAZORPAY_WEBHOOK_SECRET`; only meaningful once real Razorpay
 * credentials + a registered webhook URL exist (same "no background worker
 * yet" caveat as Sprint 5's scheduler — nothing calls this in stub mode).
 *
 * Uses the raw body for signature verification — parsing JSON first would
 * reformat the bytes and break the HMAC check.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  // Real idempotency (Integration Sprint 6) — a signature-valid retry of the
  // identical payload (Razorpay does retry on non-2xx, per the comment
  // below) now hits webhook_events' unique (provider, payload_hash) index
  // instead of re-running adminConfirmPayment/adminMarkPaymentFailed a
  // second time. This was a real gap before: confirmPayment's own
  // `if (payment.status === "captured") return` made *that* path idempotent
  // already, but adminMarkPaymentFailed had no equivalent guard.
  const log = await logWebhookEvent("razorpay", rawBody, payload.event, true, payload);
  if (log.isDuplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const entity = payload.payload?.payment?.entity;
  const orderId = entity?.order_id;

  try {
    switch (payload.event) {
      case "payment.captured": {
        if (!orderId || !entity?.id) break;
        const payment = await adminFindPaymentByOrderId(orderId);
        if (payment) await adminConfirmPayment(payment, entity.id);
        break;
      }
      case "payment.failed": {
        if (!orderId) break;
        await adminMarkPaymentFailed(orderId, entity?.error_description ?? "Payment failed");
        break;
      }
      // subscription.charged / subscription.cancelled: same shape, wired in once
      // real recurring-subscription credentials exist.
      default:
        break;
    }
    if (log.eventId) await markWebhookProcessed(log.eventId, "processed");
  } catch (e) {
    // Razorpay retries on non-2xx — log and still 200 once we've done what we can,
    // to avoid a retry storm on a permanently-failing event.
    if (log.eventId) await markWebhookProcessed(log.eventId, "failed", e instanceof Error ? e.message : String(e));
    logger.error(e, { source: "razorpay_webhook", event: payload.event });
  }

  return NextResponse.json({ ok: true });
}
