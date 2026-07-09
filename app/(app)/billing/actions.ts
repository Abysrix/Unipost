"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { Plan } from "@/lib/auth/role";
import type { BillingCycle } from "@/types/billing";
import * as db from "@/lib/db/billing";
import { mockPaymentReceipt } from "@/lib/billing/razorpay";

async function guard() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

function revalidate() {
  revalidatePath("/billing");
  revalidatePath("/dashboard");
}

export async function startCheckout(plan: Plan, cycle: BillingCycle): Promise<db.CheckoutResult> {
  await guard();
  return db.createCheckoutOrder(plan, cycle);
}

export async function confirmCheckout(input: db.ConfirmPaymentInput): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const res = await db.confirmPayment(input);
  revalidate();
  return res;
}

/**
 * The mock checkout modal's "Pay" button. The stub payment receipt is
 * generated server-side (it needs the internal stub secret, never sent to the
 * browser) and flows through the exact same `confirmPayment` verification +
 * activation path a real Razorpay success handler would use.
 */
export async function mockPay(orderId: string): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const { paymentId, signature } = mockPaymentReceipt(orderId);
  const res = await db.confirmPayment({ orderId, paymentId, signature });
  revalidate();
  return res;
}

export async function cancelSubscriptionAction(): Promise<{ error?: string }> {
  await guard();
  try {
    await db.cancelSubscription();
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to cancel." };
  }
}

export async function reactivateSubscriptionAction(): Promise<{ error?: string }> {
  await guard();
  try {
    await db.reactivateSubscription();
    revalidate();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reactivate." };
  }
}

export async function retryPaymentAction(paymentId: string): Promise<db.CheckoutResult> {
  await guard();
  return db.retryPayment(paymentId);
}
