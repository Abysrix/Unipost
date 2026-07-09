import { createAdminClient, syncPlanMetadata } from "@/lib/supabase/admin";
import { planLimits } from "@/lib/billing/plans";
import type { Plan } from "@/lib/auth/role";
import type { Subscription, Payment, Invoice } from "@/types/billing";
import { logAudit } from "./audit";

const SUB_COLS = "id,user_id,plan,status,billing_cycle,current_period_start,current_period_end,cancel_at_period_end,razorpay_customer_id,razorpay_subscription_id,created_at,updated_at";
const PAYMENT_COLS = "id,user_id,subscription_id,plan,billing_cycle,amount,currency,status,razorpay_order_id,razorpay_payment_id,razorpay_signature,failure_reason,created_at,updated_at";
const INVOICE_COLS = "id,user_id,subscription_id,payment_id,invoice_number,plan,billing_cycle,amount,currency,status,period_start,period_end,invoice_url,created_at";

export async function listAllSubscriptions(status?: Subscription["status"]): Promise<Subscription[]> {
  const admin = createAdminClient();
  let q = admin.from("subscriptions").select(SUB_COLS).order("created_at", { ascending: false }).limit(500);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Subscription[];
}

export async function listAllPayments(status?: Payment["status"]): Promise<Payment[]> {
  const admin = createAdminClient();
  let q = admin.from("payments").select(PAYMENT_COLS).order("created_at", { ascending: false }).limit(500);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

export async function listAllInvoices(): Promise<Invoice[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("invoices").select(INVOICE_COLS).order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Invoice[];
}

/** Monthly revenue for the trailing `months` — bar-chart data for the admin billing page. */
export async function revenueByMonth(months = 6): Promise<{ month: string; amount: number }[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  const { data, error } = await admin.from("payments").select("amount,created_at").eq("status", "captured").gte("created_at", since.toISOString());
  if (error) throw error;

  const byMonth = new Map<string, number>();
  for (const p of (data ?? []) as { amount: number; created_at: string }[]) {
    const key = p.created_at.slice(0, 7); // YYYY-MM
    byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount);
  }
  const out: { month: string; amount: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    out.push({ month: key, amount: byMonth.get(key) ?? 0 });
  }
  return out;
}

/* ── Manual overrides (all audited) ── */
export async function adminSetPlan(userId: string, plan: Plan, actorId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("subscriptions").upsert({ user_id: userId, plan, status: "active" }, { onConflict: "user_id" });
  await syncPlanMetadata(userId, plan);
  await logAudit("admin_action", "subscription_plan_set", { actorId, targetId: userId, message: `Plan manually set to ${planLimits(plan).name}`, metadata: { plan } });
}

export async function adminCancelSubscription(userId: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("subscriptions").update({ cancel_at_period_end: true }).eq("user_id", userId);
  await logAudit("admin_action", "subscription_canceled", { actorId, targetId: userId, message: "Canceled by admin (ends at period end)" });
}

export async function adminRenewSubscription(userId: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("subscriptions").select(SUB_COLS).eq("user_id", userId).maybeSingle();
  const sub = data as unknown as Subscription | null;
  if (!sub) return;
  const nextEnd = new Date();
  if (sub.billing_cycle === "yearly") nextEnd.setFullYear(nextEnd.getFullYear() + 1);
  else nextEnd.setMonth(nextEnd.getMonth() + 1);
  await admin.from("subscriptions").update({ status: "active", cancel_at_period_end: false, current_period_start: new Date().toISOString(), current_period_end: nextEnd.toISOString() }).eq("user_id", userId);
  await logAudit("admin_action", "subscription_renewed", { actorId, targetId: userId, message: "Renewed by admin" });
}

/**
 * Record-keeping only — does NOT call Razorpay's refund API (that moves real
 * money and is out of scope for an autonomous admin action). Marks the
 * payment refunded in our own records after the admin has processed the
 * actual refund in the Razorpay dashboard themselves.
 */
export async function adminRecordRefund(paymentId: string, actorId: string, note?: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("payments").update({ status: "refunded" }).eq("id", paymentId);
  if (error) throw error;
  await logAudit("admin_action", "payment_refund_recorded", { actorId, message: note ?? "Refund recorded (processed manually in Razorpay)", metadata: { paymentId } });
}
