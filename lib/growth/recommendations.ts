import type { CreatorStats, Goal, RecommendationKind, RecommendationSeverity } from "@/types/growth";
import { getPlatform } from "@/config/platforms";
import { BEST_TIMES } from "@/lib/schedule/scheduling";
import { GOAL_METRIC_LABELS, goalProgress } from "./goals";

export interface RecommendationCandidate {
  kind: RecommendationKind;
  title: string;
  description: string;
  action_label: string | null;
  action_href: string | null;
  severity: RecommendationSeverity;
}

type Rule = (stats: CreatorStats, goals: Goal[]) => RecommendationCandidate | null;

const streakRisk: Rule = (stats) => {
  if (stats.currentStreak > 0 || stats.postsLast7d > 0) return null;
  return {
    kind: "streak_risk",
    title: "You've gone quiet",
    description: "No activity in the last few days. A quick post today keeps your momentum alive.",
    action_label: "Create a post",
    action_href: "/create",
    severity: "warning",
  };
};

const timing: Rule = (stats) => {
  const platform = stats.bestPlatform;
  if (!platform || stats.bestPostingHour == null) return null;
  const best = BEST_TIMES[platform];
  if (!best?.length) return null;
  const bestHour = Number(best[0].split(":")[0]);
  if (Math.abs(bestHour - stats.bestPostingHour) < 2) return null;
  const name = getPlatform(platform)?.name ?? platform;
  return {
    kind: "timing",
    title: `Shift your ${name} posting time`,
    description: `You usually post around ${formatHour(stats.bestPostingHour)}, but ${name} tends to perform best between ${best.map(formatHourStr).join(", ")}. Try scheduling closer to that window.`,
    action_label: "Open calendar",
    action_href: "/calendar",
    severity: "info",
  };
};

const format: Rule = (stats) => {
  if (stats.totalPosts < 3 || stats.mediaAttachRate >= 0.5) return null;
  return {
    kind: "format",
    title: "Add more visuals",
    description: `Only ${Math.round(stats.mediaAttachRate * 100)}% of your recent posts include a photo or video. Posts with media typically get more reach and saves.`,
    action_label: "Open editor",
    action_href: "/create",
    severity: "info",
  };
};

const platformDiversity: Rule = (stats) => {
  if (stats.totalPosts < 4 || stats.platformsUsed.length >= 2) return null;
  return {
    kind: "platform",
    title: "Diversify your platforms",
    description: "You're posting to just one platform. Repurposing content to a second platform can meaningfully grow your total reach.",
    action_label: "Create a post",
    action_href: "/create",
    severity: "info",
  };
};

const engagementDrop: Rule = (stats) => {
  if (stats.latestReachLast30d < 50) return null; // not enough signal yet
  if (stats.engagementRate >= 0.03) return null;
  return {
    kind: "engagement_drop",
    title: "Engagement is running low",
    description: `Your engagement rate is ${(stats.engagementRate * 100).toFixed(1)}% over the last 30 days. Try asking a question in your caption or replying to comments within the first hour.`,
    action_label: "Ask the coach",
    action_href: `/ai?prompt=${encodeURIComponent("My engagement rate has been low lately — what specifically should I change about my captions or posting habits?")}`,
    severity: "warning",
  };
};

const aiUsage: Rule = (stats) => {
  if (stats.postsLast30d < 3 || stats.aiGenerations + stats.aiMessages >= 5) return null;
  return {
    kind: "ai_usage",
    title: "Let AI speed you up",
    description: "You're publishing consistently but barely using UniPost AI. Try generating hooks or captions — it takes seconds.",
    action_label: "Open AI Studio",
    action_href: "/ai",
    severity: "info",
  };
};

const growthWin: Rule = (stats) => {
  if (stats.followerGrowthPct30d < 0.05) return null;
  return {
    kind: "growth_win",
    title: "Great momentum",
    description: `You're up ${(stats.followerGrowthPct30d * 100).toFixed(1)}% over the last 30 days. Keep your current posting rhythm — it's working.`,
    action_label: null,
    action_href: null,
    severity: "success",
  };
};

const goalProgressRule: Rule = (_stats, goals) => {
  const active = goals.filter((g) => g.status === "active");
  const closest = active
    .map((g) => ({ g, p: goalProgress(g.current, g.target) }))
    .sort((a, b) => b.p - a.p)[0];
  if (!closest || closest.p < 0.75) return null;
  return {
    kind: "goal_progress",
    title: `Almost there: ${GOAL_METRIC_LABELS[closest.g.metric]}`,
    description: `You're at ${Math.round(closest.p * 100)}% of your ${GOAL_METRIC_LABELS[closest.g.metric].toLowerCase()} goal. A final push this week could get you there.`,
    action_label: "View goals",
    action_href: "/score",
    severity: "success",
  };
};

const RULES: Rule[] = [streakRisk, timing, format, platformDiversity, engagementDrop, aiUsage, growthWin, goalProgressRule];

/** Run every rule and return the candidates that fired (max ~8, one per kind). */
export function generateRecommendations(stats: CreatorStats, goals: Goal[]): RecommendationCandidate[] {
  return RULES.map((rule) => rule(stats, goals)).filter((r): r is RecommendationCandidate => r !== null);
}

function formatHour(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}
function formatHourStr(hhmm: string): string {
  return formatHour(Number(hhmm.split(":")[0]));
}
