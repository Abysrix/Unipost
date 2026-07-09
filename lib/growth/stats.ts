import type { PlatformId } from "@/config/platforms";
import type { Post } from "@/types/post";
import type { ScheduledEvent } from "@/types/schedule";
import type { AnalyticsDay, CreatorStats } from "@/types/growth";
import { validateForPlatforms } from "@/lib/validations/post";
import { hourInZone } from "@/lib/schedule/timezone";

export interface RawGrowthInputs {
  /** All non-deleted posts for the user (any status). */
  posts: Post[];
  /** All scheduled_posts rows for the user (any status). */
  scheduled: ScheduledEvent[];
  /** Trailing ~60 days of analytics, all platforms. */
  analytics: AnalyticsDay[];
  aiGenerationsCount: number;
  aiConversationsCount: number;
  aiMessagesCount: number;
  goalsCompletedCount: number;
}

const DAY_MS = 86_400_000;
const dateKey = (iso: string) => iso.slice(0, 10);

function activeDateKeys(input: RawGrowthInputs): Set<string> {
  const keys = new Set<string>();
  for (const p of input.posts) keys.add(dateKey(p.created_at));
  for (const s of input.scheduled) {
    keys.add(dateKey(s.created_at));
    if (s.published_at) keys.add(dateKey(s.published_at));
  }
  return keys;
}

function computeStreaks(activeDates: Set<string>): { current: number; longest: number } {
  if (activeDates.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(activeDates)
    .map((k) => new Date(`${k}T00:00:00Z`).getTime())
    .sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] - sorted[i - 1] === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak: walk back from today (or yesterday, so "posted yesterday,
  // nothing yet today" doesn't zero out mid-day) while consecutive days exist.
  const todayUtc = new Date(`${dateKey(new Date().toISOString())}T00:00:00Z`).getTime();
  let cursor = activeDates.has(dateKey(new Date(todayUtc).toISOString()))
    ? todayUtc
    : activeDates.has(dateKey(new Date(todayUtc - DAY_MS).toISOString()))
      ? todayUtc - DAY_MS
      : null;
  let current = 0;
  while (cursor !== null && activeDates.has(dateKey(new Date(cursor).toISOString()))) {
    current++;
    cursor -= DAY_MS;
  }

  return { current, longest };
}

export function buildCreatorStats(input: RawGrowthInputs): CreatorStats {
  const now = Date.now();
  const d30 = now - 30 * DAY_MS;
  const d7 = now - 7 * DAY_MS;

  const activeDates = activeDateKeys(input);
  const activeDaysLast30d = Array.from(activeDates).filter((k) => new Date(`${k}T00:00:00Z`).getTime() >= d30).length;
  const { current: currentStreak, longest: longestStreak } = computeStreaks(activeDates);

  const publishedSchedules = input.scheduled.filter((s) => s.status === "published" && s.published_at);
  const postsLast30d = publishedSchedules.filter((s) => new Date(s.published_at as string).getTime() >= d30).length;
  const postsLast7d = publishedSchedules.filter((s) => new Date(s.published_at as string).getTime() >= d7).length;

  const platformsUsed = Array.from(
    new Set<PlatformId>([...input.posts.flatMap((p) => p.platforms), ...input.scheduled.map((s) => s.platform)]),
  );

  // Analytics window (last 30 days).
  const analyticsWindow = input.analytics.filter((a) => new Date(`${a.date}T00:00:00Z`).getTime() >= d30);
  const reachSum = analyticsWindow.reduce((s, a) => s + a.reach, 0);
  const engagementSum = analyticsWindow.reduce((s, a) => s + a.likes + a.comments + a.shares + a.saves, 0);
  const engagementRate = reachSum > 0 ? engagementSum / reachSum : 0;

  // Latest per-platform followers (most recent row per platform).
  const latestByPlatform = new Map<PlatformId, AnalyticsDay>();
  for (const a of input.analytics) {
    const existing = latestByPlatform.get(a.platform);
    if (!existing || a.date > existing.date) latestByPlatform.set(a.platform, a);
  }
  const latestFollowers = Array.from(latestByPlatform.values()).reduce((s, a) => s + a.followers, 0);

  // Follower growth %: earliest vs. latest row within the window, per platform, summed.
  const earliestByPlatform = new Map<PlatformId, AnalyticsDay>();
  for (const a of analyticsWindow) {
    const existing = earliestByPlatform.get(a.platform);
    if (!existing || a.date < existing.date) earliestByPlatform.set(a.platform, a);
  }
  const startFollowers = Array.from(earliestByPlatform.values()).reduce((s, a) => s + a.followers, 0);
  const endFollowers = Array.from(latestByPlatform.entries())
    .filter(([p]) => earliestByPlatform.has(p))
    .reduce((s, [, a]) => s + a.followers, 0);
  const followerGrowthPct30d = startFollowers > 0 ? (endFollowers - startFollowers) / startFollowers : 0;

  // Best platform: highest total reach in the window; falls back to most-used platform.
  const reachByPlatform = new Map<PlatformId, number>();
  for (const a of analyticsWindow) reachByPlatform.set(a.platform, (reachByPlatform.get(a.platform) ?? 0) + a.reach);
  const bestPlatform =
    Array.from(reachByPlatform.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? platformsUsed[0] ?? null;

  // Best posting hour: the most common hour (in each row's own zone) across scheduled posts.
  const hourCounts = new Map<number, number>();
  for (const s of input.scheduled) {
    const h = hourInZone(s.scheduled_time, s.timezone);
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  const bestPostingHour = hourCounts.size > 0 ? Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0][0] : null;

  const mediaAttachRate = input.posts.length > 0 ? input.posts.filter((p) => p.media.length > 0).length / input.posts.length : 0;
  const postsWithPlatforms = input.posts.filter((p) => p.platforms.length > 0);
  const withinLimitRate =
    postsWithPlatforms.length > 0
      ? postsWithPlatforms.filter((p) => validateForPlatforms(p.content, p.media, p.platforms).every((v) => v.ok)).length /
        postsWithPlatforms.length
      : 1;

  return {
    totalPosts: input.posts.length,
    publishedPosts: input.posts.filter((p) => p.status === "published").length,
    postsLast30d,
    postsLast7d,
    activeDaysLast30d,
    currentStreak,
    longestStreak,
    platformsUsed,
    aiGenerations: input.aiGenerationsCount,
    aiConversations: input.aiConversationsCount,
    aiMessages: input.aiMessagesCount,
    scheduledUpcoming: input.scheduled.filter((s) => s.status === "scheduled" || s.status === "queued").length,
    failedSchedules: input.scheduled.filter((s) => s.status === "failed").length,
    goalsCompleted: input.goalsCompletedCount,
    latestFollowers,
    latestReachLast30d: reachSum,
    engagementRate,
    followerGrowthPct30d,
    bestPlatform,
    bestPostingHour,
    mediaAttachRate,
    withinLimitRate,
  };
}
