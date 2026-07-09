import type { Plan } from "@/lib/auth/role";
import type { BillingCycle } from "@/types/billing";

/**
 * Technical plan-limits engine. `config/pricing.ts` stays landing-page marketing
 * copy (final, do not restructure) — this is the machine-readable counterpart
 * every gate/limit/credit check in the app reads from. Add a plan here, never
 * hardcode a number anywhere else.
 */
export interface PlanLimits {
  id: Plan;
  name: string;
  priceMonthly: number; // INR
  priceYearly: number; // INR — monthly-equivalent when billed annually
  aiCreditsPerMonth: number;
  storageLimitBytes: number;
  maxConnectedAccounts: number;
  /** Active (not yet published/canceled) schedules at once. */
  maxScheduledPosts: number;
  /** Max day-range selectable on the Analytics page. */
  analyticsRangeDays: number;
  prioritySupport: boolean;
  teamSeats: number;
}

const GB = 1024 * 1024 * 1024;
export const UNLIMITED = Infinity;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    aiCreditsPerMonth: 50,
    storageLimitBytes: 0.5 * GB,
    maxConnectedAccounts: 3,
    maxScheduledPosts: 30,
    analyticsRangeDays: 7,
    prioritySupport: false,
    teamSeats: 1,
  },
  pro: {
    id: "pro",
    name: "Creator Pro",
    priceMonthly: 799,
    priceYearly: 639,
    aiCreditsPerMonth: 1000,
    storageLimitBytes: 10 * GB,
    maxConnectedAccounts: UNLIMITED,
    maxScheduledPosts: UNLIMITED,
    analyticsRangeDays: 90,
    prioritySupport: false,
    teamSeats: 1,
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceMonthly: 2499,
    priceYearly: 1999,
    aiCreditsPerMonth: 5000,
    storageLimitBytes: 50 * GB,
    maxConnectedAccounts: UNLIMITED,
    maxScheduledPosts: UNLIMITED,
    analyticsRangeDays: 365,
    prioritySupport: true,
    teamSeats: 5,
  },
};

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export const PLAN_ORDER: Plan[] = ["free", "pro", "agency"];
export function isUpgrade(from: Plan, to: Plan): boolean {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from);
}
