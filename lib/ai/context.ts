import { getCurrentUser } from "@/lib/auth/getUser";
import { getOwnProfile } from "@/lib/db/profiles";
import { listConnections } from "@/lib/db/integrations";
import { listAllPosts } from "@/lib/db/posts";
import { listEvents } from "@/lib/db/schedule";
import { listAnalytics, listScoreHistory, listGoals, listUnlockedAchievements } from "@/lib/db/growth";
import { listPostAnalytics } from "@/lib/db/analytics";
import { listGenerations } from "@/lib/db/ai";
import { buildCreatorStats } from "@/lib/growth/stats";
import { ACHIEVEMENTS } from "@/lib/growth/achievements";
import { goalProgress, GOAL_METRIC_LABELS } from "@/lib/growth/goals";
import { getMemory } from "@/lib/ai/memory";
import { getCachedContext, setCachedContext, CONTEXT_VERSION } from "@/lib/ai/contextCache";
import type { PlatformId } from "@/config/platforms";
import type { Plan } from "@/lib/auth/role";
import type { ScoreBreakdown } from "@/types/growth";
import type { CreatorMemory } from "@/lib/ai/memory";

export { invalidateCreatorContext } from "@/lib/ai/contextCache";

/**
 * Context Service — the one place every AI call site (chat, Smart Editor
 * actions, Creator Studio's AI Write, the Growth Coach) gets a creator's
 * real situation from, instead of each one independently querying half a
 * dozen tables (or, worse, sending raw rows straight into a prompt). Every
 * field here is already summarized/aggregated — nothing downstream should
 * ever need to re-read `analytics_daily`/`posts`/etc. directly just to
 * answer "does this creator use Instagram."
 *
 * Deliberately does NOT call `syncGrowth()` — that function writes (XP
 * awards, score recompute, analytics sync, recommendation refresh) and is
 * meant to run once per page load of the growth-facing pages, not once per
 * chat message. This reads whatever `syncGrowth()` most recently computed;
 * `ai_context_cache` (below) keeps repeated calls within a session cheap
 * without re-querying every table each time.
 */

export interface CreatorContext {
  version: number;
  profile: {
    displayName: string;
    plan: Plan;
    timezone: string;
    creatorScore: number;
    xp: number;
  };
  connectedPlatforms: { platform: PlatformId; username: string | null }[];
  activity: {
    totalPosts: number;
    postsLast30d: number;
    currentStreak: number;
    longestStreak: number;
    platformsUsed: PlatformId[];
  };
  performance: {
    latestFollowers: number;
    reachLast30d: number;
    engagementRatePct: number;
    followerGrowthPct30d: number;
    bestPlatform: PlatformId | null;
    bestPostingHour: number | null;
  } | null;
  score: { total: number; grade: string; breakdown: ScoreBreakdown } | null;
  goals: { metric: string; platform: PlatformId | null; target: number; current: number; progressPct: number }[];
  recentAchievements: string[];
  topPosts: { title: string; platform: PlatformId; reach: number; engagement: number }[];
  recentTopics: string[];
  memory: CreatorMemory | null;
  computedAt: string;
}

async function buildFresh(userId: string): Promise<CreatorContext> {
  const [profile, connections, posts, scheduled, analytics, scoreHistory, goals, unlocked, postAnalytics, generations, memory] = await Promise.all([
    getOwnProfile(),
    listConnections(),
    listAllPosts(),
    listEvents(),
    listAnalytics(30),
    listScoreHistory(1),
    listGoals(),
    listUnlockedAchievements(),
    listPostAnalytics(),
    listGenerations(),
    getMemory(userId),
  ]);

  const stats = buildCreatorStats({
    posts,
    scheduled,
    analytics,
    aiGenerationsCount: 0,
    aiConversationsCount: 0,
    aiMessagesCount: 0,
    goalsCompletedCount: goals.filter((g) => g.status === "completed").length,
  });

  const latestScore = scoreHistory[0] ?? null;
  const achievementTitles = new Map(ACHIEVEMENTS.map((a) => [a.id, a.title]));
  const titleByScheduledPostId = new Map(scheduled.map((s) => [s.id, s.post?.title?.trim() || "Untitled post"]));

  const topPosts = [...postAnalytics]
    .sort((a, b) => b.likes + b.comments + b.shares + b.saves - (a.likes + a.comments + a.shares + a.saves))
    .slice(0, 3)
    .map((p) => ({ title: titleByScheduledPostId.get(p.scheduled_post_id) ?? "", platform: p.platform, reach: p.reach || p.impressions, engagement: p.likes + p.comments + p.shares + p.saves }));

  return {
    version: CONTEXT_VERSION,
    profile: { displayName: profile.display_name || profile.email.split("@")[0], plan: profile.plan, timezone: profile.timezone, creatorScore: profile.creator_score, xp: profile.xp },
    connectedPlatforms: connections.filter((c) => c.status !== "disconnected").map((c) => ({ platform: c.platform, username: c.username })),
    activity: {
      totalPosts: stats.totalPosts,
      postsLast30d: stats.postsLast30d,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      platformsUsed: stats.platformsUsed,
    },
    performance: analytics.length > 0
      ? {
          latestFollowers: stats.latestFollowers,
          reachLast30d: stats.latestReachLast30d,
          engagementRatePct: Math.round(stats.engagementRate * 1000) / 10,
          followerGrowthPct30d: Math.round(stats.followerGrowthPct30d * 1000) / 10,
          bestPlatform: stats.bestPlatform,
          bestPostingHour: stats.bestPostingHour,
        }
      : null,
    score: latestScore ? { total: latestScore.score, grade: latestScore.grade, breakdown: { consistency: latestScore.consistency, frequency: latestScore.frequency, engagement: latestScore.engagement, platform_activity: latestScore.platform_activity, growth: latestScore.growth, ai_utilization: latestScore.ai_utilization, content_quality: latestScore.content_quality } } : null,
    goals: goals.filter((g) => g.status === "active").map((g) => ({ metric: GOAL_METRIC_LABELS[g.metric], platform: g.platform, target: g.target, current: g.current, progressPct: Math.round(goalProgress(g.current, g.target) * 100) })),
    recentAchievements: unlocked.slice(0, 5).map((u) => achievementTitles.get(u.achievement_id) ?? u.achievement_id),
    topPosts,
    recentTopics: generations.slice(0, 8).map((g) => String((g.input as { topic?: string; text?: string })?.topic ?? (g.input as { topic?: string; text?: string })?.text ?? "").slice(0, 80)).filter(Boolean),
    memory,
    computedAt: new Date().toISOString(),
  };
}

/**
 * The real entrypoint every AI call site uses. Reads `ai_context_cache`
 * first (via the leaf `contextCache` module — see its own doc comment for
 * why this split exists) — a fresh hit skips every other query entirely.
 * Never throws: a context-build failure shouldn't block a chat message or
 * an editor action from at least attempting a (less personalized) response.
 */
export async function getCreatorContext(): Promise<CreatorContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const cached = await getCachedContext<CreatorContext>(user.id);
    if (cached) return cached;

    const context = await buildFresh(user.id);
    await setCachedContext(user.id, context, context.computedAt);
    return context;
  } catch {
    return null;
  }
}
