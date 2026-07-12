import type { ScheduledEvent } from "@/types/schedule";
import type { AnalyticsDay, PostAnalytics } from "@/types/growth";

/**
 * Per-post performance: real where `post_analytics` has a synced row for a
 * post (Integration Sprint 4 — real provider per-post metrics), an ESTIMATE
 * otherwise. Not every published post has real data yet — a real sync only
 * covers platforms with a registered analytics provider and a genuine
 * (non-stub) connection (see `lib/analytics/sync.ts`), and even then only
 * back to whenever that connection's first sync ran. For everything else,
 * the same estimate as before: split that day's platform-level analytics
 * evenly across that day's published posts — grounded in real publish
 * activity + real (or simulated-fallback) daily analytics, not fabricated
 * from nothing.
 */
export interface PostPerformance {
  event: ScheduledEvent;
  estimatedReach: number;
  estimatedEngagement: number;
  /** True when these numbers come from a real per-post provider sync rather than the day-level estimate. */
  isReal: boolean;
}

export function estimatePostPerformance(published: ScheduledEvent[], analytics: AnalyticsDay[], realMetrics: Map<string, PostAnalytics> = new Map()): PostPerformance[] {
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
      const real = realMetrics.get(event.id);
      if (real) {
        return { event, estimatedReach: real.reach || real.impressions, estimatedEngagement: real.likes + real.comments + real.shares + real.saves, isReal: true };
      }

      const key = `${event.platform}:${(event.published_at as string).slice(0, 10)}`;
      const day = analyticsByDayPlatform.get(key);
      const postsThatDay = byDayPlatform.get(key) ?? 1;
      const engagement = day ? day.likes + day.comments + day.shares + day.saves : 0;
      return {
        event,
        estimatedReach: day ? Math.round(day.reach / postsThatDay) : 0,
        estimatedEngagement: Math.round(engagement / postsThatDay),
        isReal: false,
      };
    })
    .sort((a, b) => b.estimatedEngagement - a.estimatedEngagement);
}
