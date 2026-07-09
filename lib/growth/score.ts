import type { CreatorStats, ScoreBreakdown } from "@/types/growth";

/**
 * Creator Score — 7 weighted sub-scores (0-100 each) → one 0-100 score + letter
 * grade. Consistency/Frequency/PlatformActivity/AIUtilization/ContentQuality are
 * computed from 100% real product data (posts, schedules, AI usage). Engagement
 * and Growth depend on analytics numbers, which are simulated until a live
 * platform API lands (see lib/growth/simulate.ts) — clearly separated so the
 * score is honest about what it actually knows.
 */
export const SCORE_WEIGHTS: ScoreBreakdown = {
  consistency: 0.2,
  frequency: 0.15,
  engagement: 0.2,
  platform_activity: 0.1,
  growth: 0.15,
  ai_utilization: 0.1,
  content_quality: 0.1,
};

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Consistency: reward regular posting cadence over the last 30 days, not just volume. */
function consistencyScore(stats: CreatorStats): number {
  const activeRatio = stats.activeDaysLast30d / 30;
  const streakBonus = Math.min(stats.currentStreak / 14, 1) * 0.3;
  return clamp100((activeRatio * 0.85 + streakBonus) * 100);
}

/** Frequency: posts published in the last 30 days vs. a healthy benchmark (12/mo). */
function frequencyScore(stats: CreatorStats): number {
  const BENCHMARK = 12;
  return clamp100((stats.postsLast30d / BENCHMARK) * 100);
}

/** Engagement: engagement rate (0..1) scaled against a strong-creator benchmark (8%). */
function engagementScore(stats: CreatorStats): number {
  const BENCHMARK = 0.08;
  return clamp100((stats.engagementRate / BENCHMARK) * 100);
}

/** Platform activity: breadth across the 6 supported platforms. */
function platformActivityScore(stats: CreatorStats): number {
  return clamp100((stats.platformsUsed.length / 6) * 100);
}

/** Growth: 30-day follower growth %, mapped so 0% ≈ 50, +10% ≈ 100, -10% ≈ 0. */
function growthScore(stats: CreatorStats): number {
  return clamp100(50 + stats.followerGrowthPct30d * 500);
}

/** AI utilization: real signal from Sprint 4 usage (generations + chat messages). */
function aiUtilizationScore(stats: CreatorStats): number {
  const uses = stats.aiGenerations + stats.aiMessages;
  const BENCHMARK = 40;
  return clamp100((uses / BENCHMARK) * 100);
}

/** Content quality: media-attach rate + staying within each platform's limits. */
function contentQualityScore(stats: CreatorStats): number {
  return clamp100((stats.mediaAttachRate * 0.4 + stats.withinLimitRate * 0.6) * 100);
}

export function computeScoreBreakdown(stats: CreatorStats): ScoreBreakdown {
  return {
    consistency: consistencyScore(stats),
    frequency: frequencyScore(stats),
    engagement: engagementScore(stats),
    platform_activity: platformActivityScore(stats),
    growth: growthScore(stats),
    ai_utilization: aiUtilizationScore(stats),
    content_quality: contentQualityScore(stats),
  };
}

export function weightedTotal(breakdown: ScoreBreakdown): number {
  const total = (Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[]).reduce(
    (sum, key) => sum + breakdown[key] * SCORE_WEIGHTS[key],
    0,
  );
  return clamp100(total);
}

export function gradeFor(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

export const SCORE_FACTOR_LABELS: Record<keyof ScoreBreakdown, { label: string; description: string }> = {
  consistency: { label: "Consistency", description: "How regularly you post, not just how often" },
  frequency: { label: "Posting Frequency", description: "Volume of posts in the last 30 days" },
  engagement: { label: "Engagement", description: "Likes, comments, shares & saves vs. reach" },
  platform_activity: { label: "Platform Activity", description: "Breadth across your connected platforms" },
  growth: { label: "Growth", description: "Follower trend over the last 30 days" },
  ai_utilization: { label: "AI Utilization", description: "How much you use UniPost AI to work faster" },
  content_quality: { label: "Content Quality", description: "Media usage and staying within platform limits" },
};
