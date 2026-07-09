import type { Plan } from "@/lib/auth/role";
import { planLimits } from "./plans";

/** The furthest-back day-range a plan may query on the Analytics page. */
export function maxAnalyticsRangeDays(plan: Plan): number {
  return planLimits(plan).analyticsRangeDays;
}
