import type { ScheduledEvent } from "@/types/schedule";
import type { AnalyticsDay } from "@/types/growth";

/**
 * Per-post performance is an ESTIMATE: there's no live per-post metrics API yet
 * (same limitation analytics_daily has). Each day's simulated platform metrics
 * are split evenly across that day's actually-published posts on that platform,
 * so the ranking is grounded in real publish activity + real daily analytics —
 * not fabricated from nothing. Replace with real per-post metrics once a
 * platform API lands; nothing downstream needs to change.
 */
export interface PostPerformance {
  event: ScheduledEvent;
  estimatedReach: number;
  estimatedEngagement: number;
}

export function estimatePostPerformance(published: ScheduledEvent[], analytics: AnalyticsDay[]): PostPerformance[] {
  const byDayPlatform = new Map<string, number>();
  for (const e of published) {
    if (!e.published_at) continue;
    const key = `${e.platform}:${e.published_at.slice(0, 10)}`;
    byDayPlatform.set(key, (byDayPlatform.get(key) ?? 0) + 1);
  }
  const analyticsByDayPlatform = new Map<string, AnalyticsDay>();
  for (const a of analytics) analyticsByDayPlatform.set(`${a.platform}:${a.date}`, a);

  return published
    .filter((e) => e.published_at)
    .map((event) => {
      const key = `${event.platform}:${(event.published_at as string).slice(0, 10)}`;
      const day = analyticsByDayPlatform.get(key);
      const postsThatDay = byDayPlatform.get(key) ?? 1;
      const engagement = day ? day.likes + day.comments + day.shares + day.saves : 0;
      return {
        event,
        estimatedReach: day ? Math.round(day.reach / postsThatDay) : 0,
        estimatedEngagement: Math.round(engagement / postsThatDay),
      };
    })
    .sort((a, b) => b.estimatedEngagement - a.estimatedEngagement);
}
