import type { Plan } from "@/lib/auth/role";

export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export type PaymentStatus = "created" | "captured" | "failed" | "refunded";
export type InvoiceStatus = "paid" | "open" | "void";

export interface Subscription {
  id: string;
  user_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan: Plan;
  billing_cycle: BillingCycle;
  amount: number; // paise
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id: string | null;
  payment_id: string | null;
  invoice_number: string;
  plan: Plan;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  period_start: string;
  period_end: string | null;
  invoice_url: string | null;
  created_at: string;
}

export interface CreditEvent {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface UsageSnapshot {
  id: string;
  user_id: string;
  period: string; // YYYY-MM-DD, first of month
  ai_credits_used: number;
  scheduled_posts_count: number;
  connected_accounts_count: number;
  storage_bytes_used: number;
  updated_at: string;
}

export type BillingEventType =
  | "subscription_created" | "subscription_upgraded" | "subscription_downgraded"
  | "subscription_canceled" | "subscription_renewed" | "subscription_reactivated"
  | "payment_succeeded" | "payment_failed" | "credits_reset" | "credits_granted";

export interface BillingEvent {
  id: string;
  user_id: string;
  event_type: BillingEventType;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Everything the billing page needs in one bundle. */
export interface BillingBundle {
  subscription: Subscription;
  creditsRemaining: number;
  creditsTotal: number;
  usage: UsageSnapshot;
  payments: Payment[];
  invoices: Invoice[];
  events: BillingEvent[];
}
