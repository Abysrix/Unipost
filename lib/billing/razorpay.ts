import { createHmac, randomBytes } from "crypto";

/**
 * Razorpay Payment Service — real REST integration, config-gated stub.
 *
 * Same philosophy as Sprint 5's publishing stub and Sprint 7's OAuth engine:
 * when `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` aren't configured, these
 * functions return deterministic stub data instead of calling out to Razorpay
 * with empty credentials (which would just fail). The checkout UI substitutes
 * an in-app mock payment modal instead of loading Razorpay's real Checkout.js,
 * but flows through the exact same server-side order → verify → activate path
 * either way. Adding real keys activates real payments — no code changes.
 */

const STUB_SECRET = "unipost-stub-only-never-used-for-real-payments";

export function hasRealCredentials(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface RazorpayOrder {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  isStub: boolean;
}

export async function createOrder(amount: number, currency: string, receipt: string): Promise<RazorpayOrder> {
  if (!hasRealCredentials()) {
    return { orderId: `order_stub_${randomBytes(10).toString("hex")}`, amount, currency, keyId: "", isStub: true };
  }

  const keyId = process.env.RAZORPAY_KEY_ID as string;
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency, receipt }),
  });
  if (!res.ok) throw new Error(`Razorpay order creation failed (${res.status}).`);
  const json = (await res.json()) as { id: string; amount: number; currency: string };
  return { orderId: json.id, amount: json.amount, currency: json.currency, keyId, isStub: false };
}

/** Razorpay's documented scheme: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = hasRealCredentials() ? (process.env.RAZORPAY_KEY_SECRET as string) : STUB_SECRET;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected === signature;
}

/** Generates a matching stub payment id + signature for the mock checkout flow. */
export function mockPaymentReceipt(orderId: string): { paymentId: string; signature: string } {
  const paymentId = `pay_stub_${randomBytes(10).toString("hex")}`;
  const signature = createHmac("sha256", STUB_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return { paymentId, signature };
}

/** Webhook payloads are signed with a separate secret. Only meaningful with real credentials. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}
