import type { CreatorStats, GoalMetric } from "@/types/growth";

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  followers: "Followers",
  reach: "Reach",
  posts: "Posts published",
  engagement: "Engagement rate",
  revenue: "Revenue",
};

export const GOAL_METRIC_UNITS: Record<GoalMetric, string> = {
  followers: "",
  reach: "",
  posts: " posts",
  engagement: "%",
  revenue: "₹",
};

/**
 * The current value for a goal's metric, from real (or simulated-analytics)
 * stats. `revenue` has no data source yet — Payments (Razorpay) isn't built,
 * so it's honestly 0 until that sprint lands.
 */
export function currentValueFor(metric: GoalMetric, stats: CreatorStats): number {
  switch (metric) {
    case "followers":
      return stats.latestFollowers;
    case "reach":
      return stats.latestReachLast30d;
    case "posts":
      return stats.postsLast30d;
    case "engagement":
      return Math.round(stats.engagementRate * 1000) / 10; // percent, 1 decimal
    case "revenue":
      return 0;
  }
}

export function goalProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
}

export function isGoalMet(current: number, target: number): boolean {
  return current >= target;
}
