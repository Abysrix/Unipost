import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setPlan } from "@/lib/db/profiles";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { Plan } from "@/lib/auth/role";
import { listAllPosts } from "@/lib/db/posts";
import { listEvents as listScheduleEvents } from "@/lib/db/schedule";
import { listConnections } from "@/lib/db/integrations";
import { planLimits, isUpgrade } from "@/lib/billing/plans";
import { monthlyAllotment, currentPeriod } from "@/lib/billing/credits";
import { createOrder, verifyPaymentSignature, type RazorpayOrder } from "@/lib/billing/razorpay";
import { notify } from "@/lib/notifications/service";
import type {
  Subscription, Payment, Invoice, CreditEvent, UsageSnapshot, BillingEvent, BillingEventType,
  BillingBundle, BillingCycle,
} from "@/types/billing";

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const SUB_COLS = "id,user_id,plan,status,billing_cycle,current_period_start,current_period_end,cancel_at_period_end,razorpay_customer_id,razorpay_subscription_id,created_at,updated_at";
const PAYMENT_COLS = "id,user_id,subscription_id,plan,billing_cycle,amount,currency,status,razorpay_order_id,razorpay_payment_id,razorpay_signature,failure_reason,created_at,updated_at";
const INVOICE_COLS = "id,user_id,subscription_id,payment_id,invoice_number,plan,billing_cycle,amount,currency,status,period_start,period_end,invoice_url,created_at";
const EVENT_COLS = "id,user_id,event_type,message,metadata,created_at";

// Writes below use the service-role admin client, not the request-scoped one —
// see the Sprint 10 note above `confirmPayment`. Every function here still
// gates on `uid()`/an explicit `user_id`/`id` filter first, so this doesn't
// widen who can call these — it only stops a caller from going around them
// with a raw `.update()`/`.insert()` against `subscriptions`/`ai_credit_history`
// directly, which the now-read-only RLS policies (migration 0009) block.
async function logEvent(userId: string, type: BillingEventType, message?: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("billing_events").insert({ user_id: userId, event_type: type, message: message ?? null, metadata });
}

/* ── Subscription ── */
export async function getOrCreateSubscription(): Promise<Subscription> {
  const userId = await uid();
  const admin = createAdminClient();

  const { data: existing, error } = await admin.from("subscriptions").select(SUB_COLS).eq("user_id", userId).maybeSingle();
  if (error) throw error;

  let sub = existing as unknown as Subscription | null;
  if (!sub) {
    const { data, error: insErr } = await admin.from("subscriptions").insert({ user_id: userId, plan: "free", status: "active" }).select(SUB_COLS).single();
    if (insErr) throw insErr;
    sub = data as unknown as Subscription;
    await logEvent(userId, "subscription_created", "Started on the Free plan");
  }

  // Ensure Free plan users have their current period's credits seeded/reset (idempotent via key)
  if (sub.plan === "free") {
    try {
      await grantCredits("monthly_reset", monthlyAllotment("free"), `reset:${userId}:${currentPeriod()}`);
    } catch {
      /* best-effort credit reset */
    }
  }

  return applyPeriodRollover(sub);
}

/** Lazily handle a period that has already ended (no background worker — same pattern as scheduling/growth). */
async function applyPeriodRollover(sub: Subscription): Promise<Subscription> {
  if (sub.plan === "free" || !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now()) return sub;

  const supabase = createAdminClient();
  if (sub.cancel_at_period_end) {
    const { data } = await supabase.from("subscriptions").update({ plan: "free", status: "active", cancel_at_period_end: false, current_period_end: null }).eq("id", sub.id).select(SUB_COLS).single();
    await logEvent(sub.user_id, "subscription_canceled", "Subscription ended — moved to Free");
    await setPlan(sub.user_id, "free").catch(() => {});
    return data as unknown as Subscription;
  }

  if (sub.razorpay_subscription_id) {
    // Real recurring billing exists — renewal must come from the `subscription.charged`
    // webhook. If the period lapsed with no webhook confirming it, flag it rather than
    // silently extending access.
    const { data } = await supabase.from("subscriptions").update({ status: "past_due" }).eq("id", sub.id).select(SUB_COLS).single();
    return data as unknown as Subscription;
  }

  // Stub mode (no real recurring subscription): simulate a renewal so paid test
  // plans stay usable, and grant the next period's credit allotment.
  const nextEnd = periodEnd(new Date(), sub.billing_cycle);
  const { data } = await supabase.from("subscriptions").update({ current_period_start: new Date().toISOString(), current_period_end: nextEnd }).eq("id", sub.id).select(SUB_COLS).single();
  await grantCredits("monthly_reset", monthlyAllotment(sub.plan), `reset:${sub.user_id}:${currentPeriod()}`);
  await logEvent(sub.user_id, "subscription_renewed", `Renewed on the ${planLimits(sub.plan).name} plan (simulated — no real recurring billing configured)`);
  return data as unknown as Subscription;
}

function periodEnd(from: Date, cycle: BillingCycle): string {
  const d = new Date(from);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function cancelSubscription(): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  await admin.from("subscriptions").update({ cancel_at_period_end: true }).eq("user_id", userId);
  await logEvent(userId, "subscription_canceled", "Cancellation scheduled for the end of the current period");
}

export async function reactivateSubscription(): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  await admin.from("subscriptions").update({ cancel_at_period_end: false }).eq("user_id", userId);
  await logEvent(userId, "subscription_reactivated", "Cancellation undone — subscription will continue renewing");
}

/* ── Payments / checkout ── */
export type CheckoutResult = (RazorpayOrder & { paymentId: string }) | { error: string };

export async function createCheckoutOrder(plan: Plan, cycle: BillingCycle): Promise<CheckoutResult> {
  const userId = await uid();
  if (plan === "free") return { error: "The Free plan doesn't need checkout." };

  const admin = createAdminClient();
  const sub = await getOrCreateSubscription();
  const amount = priceForCycle(plan, cycle);
  if (amount <= 0) return { error: "Invalid plan price." };

  const receipt = `receipt_${userId.slice(0, 8)}_${Date.now()}`;
  let order: RazorpayOrder;
  try {
    order = await createOrder(amount, "INR", receipt);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start checkout." };
  }

  const { data, error } = await admin
    .from("payments")
    .insert({ user_id: userId, subscription_id: sub.id, plan, billing_cycle: cycle, amount, currency: "INR", status: "created", razorpay_order_id: order.orderId })
    .select("id")
    .single();
  if (error) return { error: "Could not record the checkout attempt." };

  return { ...order, paymentId: (data as { id: string }).id };
}

function priceForCycle(plan: Plan, cycle: BillingCycle): number {
  const limits = planLimits(plan);
  const rupees = cycle === "yearly" ? limits.priceYearly * 12 : limits.priceMonthly;
  return Math.round(rupees * 100);
}

export interface ConfirmPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

/** Verifies the payment, activates the subscription, issues an invoice, grants credits. */
export async function confirmPayment(input: ConfirmPaymentInput): Promise<{ ok: boolean; error?: string }> {
  const userId = await uid();
  const admin = createAdminClient();

  if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
    return { ok: false, error: "Payment could not be verified." };
  }

  const { data: paymentRow, error: findErr } = await admin.from("payments").select(PAYMENT_COLS).eq("razorpay_order_id", input.orderId).eq("user_id", userId).maybeSingle();
  if (findErr || !paymentRow) return { ok: false, error: "Payment record not found." };
  const payment = paymentRow as unknown as Payment;
  if (payment.status === "captured") return { ok: true }; // already processed (idempotent)

  await admin.from("payments").update({ status: "captured", razorpay_payment_id: input.paymentId, razorpay_signature: input.signature }).eq("id", payment.id);

  const sub = await getOrCreateSubscription();
  const upgrading = isUpgrade(sub.plan, payment.plan);
  const { data: updatedSub } = await admin
    .from("subscriptions")
    .update({
      plan: payment.plan,
      status: "active",
      billing_cycle: payment.billing_cycle,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd(new Date(), payment.billing_cycle),
      cancel_at_period_end: false,
    })
    .eq("id", sub.id)
    .select(SUB_COLS)
    .single();

  await issueInvoice(userId, sub.id, payment);
  await grantCredits("plan_upgrade", monthlyAllotment(payment.plan), `upgrade:${payment.id}`);
  await setPlan(userId, payment.plan).catch(() => {});
  await logEvent(userId, "payment_succeeded", `Payment captured for ${planLimits(payment.plan).name}`, { paymentId: payment.id });
  await logEvent(userId, upgrading ? "subscription_upgraded" : "subscription_downgraded", `Now on ${planLimits(payment.plan).name}`, { plan: payment.plan });
  await notify({ userId, type: upgrading ? "subscription_upgraded" : "subscription_downgraded", title: `You're now on ${planLimits(payment.plan).name}`, message: `Your payment was captured and your plan is active.`, actionHref: "/billing", sendEmail: true }).catch(() => {});

  return { ok: true, error: updatedSub ? undefined : "Payment captured, but the subscription failed to update — contact support." };
}

async function issueInvoice(userId: string, subscriptionId: string, payment: Payment): Promise<void> {
  const admin = createAdminClient();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
  await admin.from("invoices").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    payment_id: payment.id,
    invoice_number: invoiceNumber,
    plan: payment.plan,
    billing_cycle: payment.billing_cycle,
    amount: payment.amount,
    currency: payment.currency,
    status: "paid",
    period_start: new Date().toISOString(),
    period_end: periodEnd(new Date(), payment.billing_cycle),
  });
}

export async function retryPayment(paymentId: string): Promise<CheckoutResult> {
  const userId = await uid();
  const supabase = createClient();
  const { data, error } = await supabase.from("payments").select(PAYMENT_COLS).eq("id", paymentId).eq("user_id", userId).maybeSingle();
  if (error || !data) return { error: "Payment not found." };
  const payment = data as unknown as Payment;
  return createCheckoutOrder(payment.plan, payment.billing_cycle);
}

export async function listPayments(limit = 20): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("payments").select(PAYMENT_COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

export async function listInvoices(limit = 20): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("invoices").select(INVOICE_COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Invoice[];
}

export async function listBillingEvents(limit = 20): Promise<BillingEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("billing_events").select(EVENT_COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as BillingEvent[];
}

/* ── AI credits ── */
export async function getCreditBalance(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.from("ai_credit_history").select("amount");
  if (error) throw error;
  return ((data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
}

export async function listCreditHistory(limit = 50): Promise<CreditEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("ai_credit_history").select("id,user_id,amount,reason,meta,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CreditEvent[];
}

/** Grant credits (resets, bonuses, manual, plan upgrades). Idempotent when `key` is given. */
export async function grantCredits(reason: string, amount: number, key?: string, meta: Record<string, unknown> = {}): Promise<void> {
  const userId = await uid();
  const admin = createAdminClient();
  const { error } = await admin.from("ai_credit_history").insert({ user_id: userId, amount, reason, meta: key ? { ...meta, key } : meta });
  if (error && (error as { code?: string }).code !== "23505") throw error;
}

export interface SpendResult {
  ok: boolean;
  balance: number;
  reason?: string;
}

/** Atomically check-and-deduct via the `spend_credits` DB function (race-safe). */
export async function spendCredits(reason: string, amount: number, key?: string, meta: Record<string, unknown> = {}): Promise<SpendResult> {
  const userId = await uid();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("spend_credits", { p_user_id: userId, p_amount: amount, p_reason: reason, p_key: key ?? null, p_meta: meta });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; balance: number };
  return { ok: row.ok, balance: row.balance, reason: row.ok ? undefined : `You're out of AI credits (${row.balance} left). Upgrade your plan or wait for your next monthly reset.` };
}

/* ── Usage snapshot ── */
export async function refreshUsageMetrics(): Promise<UsageSnapshot> {
  const userId = await uid();
  const admin = createAdminClient();
  const period = currentPeriod();

  const [posts, scheduled, connections, creditHistory] = await Promise.all([listAllPosts(), listScheduleEvents(), listConnections(), listCreditHistory(500)]);

  const storageBytes = posts.reduce((sum, p) => sum + p.media.reduce((s, m) => s + (m.size ?? 0), 0), 0);
  const activeSchedules = scheduled.filter((s) => s.status === "scheduled" || s.status === "queued").length;
  const activeConnections = connections.filter((c) => c.status !== "disconnected").length;
  const creditsUsedThisPeriod = creditHistory.filter((c) => c.amount < 0 && c.created_at >= period).reduce((s, c) => s + Math.abs(c.amount), 0);

  const { data, error } = await admin
    .from("usage_metrics")
    .upsert(
      { user_id: userId, period, ai_credits_used: creditsUsedThisPeriod, scheduled_posts_count: activeSchedules, connected_accounts_count: activeConnections, storage_bytes_used: storageBytes },
      { onConflict: "user_id,period" },
    )
    .select("id,user_id,period,ai_credits_used,scheduled_posts_count,connected_accounts_count,storage_bytes_used,updated_at")
    .single();
  if (error) throw error;
  return data as unknown as UsageSnapshot;
}

/* ── Orchestration ── */
export async function getBillingBundle(): Promise<BillingBundle> {
  let subscription: Subscription | undefined;
  try { subscription = await getOrCreateSubscription(); }
  catch (e) { throw new Error(`[getOrCreateSubscription] ${e instanceof Error ? e.message : JSON.stringify(e)}`); }

  const [creditsRemaining, usage, payments, invoices, events] = await Promise.all([
    getCreditBalance().catch(e => { throw new Error(`[getCreditBalance] ${e instanceof Error ? e.message : JSON.stringify(e)}`); }),
    refreshUsageMetrics().catch(e => { throw new Error(`[refreshUsageMetrics] ${e instanceof Error ? e.message : JSON.stringify(e)}`); }),
    listPayments().catch(e => { throw new Error(`[listPayments] ${e instanceof Error ? e.message : JSON.stringify(e)}`); }),
    listInvoices().catch(e => { throw new Error(`[listInvoices] ${e instanceof Error ? e.message : JSON.stringify(e)}`); }),
    listBillingEvents().catch(e => { throw new Error(`[listBillingEvents] ${e instanceof Error ? e.message : JSON.stringify(e)}`); }),
  ]);
  return { subscription, creditsRemaining, creditsTotal: monthlyAllotment(subscription.plan), usage, payments, invoices, events };
}

/* ── Webhook (admin client — no user session) ── */
export async function adminFindPaymentByOrderId(orderId: string): Promise<Payment | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("payments").select(PAYMENT_COLS).eq("razorpay_order_id", orderId).maybeSingle();
  if (error) throw error;
  return (data as unknown as Payment) ?? null;
}

/** Webhook-driven confirmation — same effect as `confirmPayment`, but via the admin client since there's no session. */
export async function adminConfirmPayment(payment: Payment, razorpayPaymentId: string): Promise<void> {
  const admin = createAdminClient();
  if (payment.status === "captured") return; // idempotent

  await admin.from("payments").update({ status: "captured", razorpay_payment_id: razorpayPaymentId }).eq("id", payment.id);

  const { data: existingSub } = await admin.from("subscriptions").select(SUB_COLS).eq("user_id", payment.user_id).maybeSingle();
  const sub = existingSub as unknown as Subscription | null;
  const subId = sub?.id ?? payment.subscription_id;
  if (subId) {
    await admin
      .from("subscriptions")
      .update({ plan: payment.plan, status: "active", billing_cycle: payment.billing_cycle, current_period_start: new Date().toISOString(), current_period_end: periodEnd(new Date(), payment.billing_cycle), cancel_at_period_end: false })
      .eq("id", subId);
  }

  const invoiceNumber = `INV-${new Date().getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
  await admin.from("invoices").insert({
    user_id: payment.user_id, subscription_id: subId, payment_id: payment.id, invoice_number: invoiceNumber,
    plan: payment.plan, billing_cycle: payment.billing_cycle, amount: payment.amount, currency: payment.currency,
    status: "paid", period_start: new Date().toISOString(), period_end: periodEnd(new Date(), payment.billing_cycle),
  });

  await admin.from("ai_credit_history").insert({ user_id: payment.user_id, amount: monthlyAllotment(payment.plan), reason: "plan_upgrade", meta: { key: `webhook:${payment.id}` } });
  await admin.from("billing_events").insert({ user_id: payment.user_id, event_type: "payment_succeeded", message: "Confirmed via webhook", metadata: { paymentId: payment.id } });
  await setPlan(payment.user_id, payment.plan).catch(() => {});
  await notify({ userId: payment.user_id, type: "subscription_upgraded", title: `You're now on ${planLimits(payment.plan).name}`, message: "Your payment was captured and your plan is active.", actionHref: "/billing", sendEmail: true }).catch(() => {});
}

export async function adminMarkPaymentFailed(orderId: string, reason: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("payments").select("id,user_id").eq("razorpay_order_id", orderId).maybeSingle();
  if (!data) return;
  const row = data as { id: string; user_id: string };
  await admin.from("payments").update({ status: "failed", failure_reason: reason }).eq("id", row.id);
  await admin.from("billing_events").insert({ user_id: row.user_id, event_type: "payment_failed", message: reason, metadata: { paymentId: row.id } });
  await notify({ userId: row.user_id, type: "payment_failed", title: "Payment failed", message: reason, actionHref: "/billing", sendEmail: true }).catch(() => {});
}
