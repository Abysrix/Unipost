import type { PlatformId } from "@/config/platforms";
import type { AnalyticsDay } from "@/types/growth";

/** Sum a numeric field across platforms, grouped by date, for the trailing `days`. */
export function dailyTotals(analytics: AnalyticsDay[], field: keyof AnalyticsDay, days: number): { date: string; value: number }[] {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const byDate = new Map<string, number>();
  for (const a of analytics) {
    if (a.date < since) continue;
    byDate.set(a.date, (byDate.get(a.date) ?? 0) + (a[field] as number));
  }
  return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
}

/** Engagement rate per day (engagement / reach), summed across platforms. */
export function dailyEngagementRate(analytics: AnalyticsDay[], days: number): { date: string; value: number }[] {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const byDate = new Map<string, { eng: number; reach: number }>();
  for (const a of analytics) {
    if (a.date < since) continue;
    const cur = byDate.get(a.date) ?? { eng: 0, reach: 0 };
    cur.eng += a.likes + a.comments + a.shares + a.saves;
    cur.reach += a.reach;
    byDate.set(a.date, cur);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, value: v.reach > 0 ? Math.round((v.eng / v.reach) * 1000) / 10 : 0 }));
}

/** Sum a field per platform over the trailing `days`. */
export function totalsByPlatform(analytics: AnalyticsDay[], field: keyof AnalyticsDay, days: number): { platform: PlatformId; value: number }[] {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const byPlatform = new Map<PlatformId, number>();
  for (const a of analytics) {
    if (a.date < since) continue;
    byPlatform.set(a.platform, (byPlatform.get(a.platform) ?? 0) + (a[field] as number));
  }
  return Array.from(byPlatform.entries()).map(([platform, value]) => ({ platform, value }));
}

/** Sum a field for the trailing `days`, ending `endDaysAgo` days ago (for period-over-period deltas). */
export function windowSum(analytics: AnalyticsDay[], field: keyof AnalyticsDay, days: number, endDaysAgo: number): number {
  const end = Date.now() - endDaysAgo * 86_400_000;
  const start = end - days * 86_400_000;
  const s = new Date(start).toISOString().slice(0, 10);
  const e = new Date(end).toISOString().slice(0, 10);
  return analytics.filter((a) => a.date > s && a.date <= e).reduce((sum, a) => sum + (a[field] as number), 0);
}

/** Latest per-platform followers total across the whole series (not just the window). */
export function latestFollowersTotal(analytics: AnalyticsDay[]): number {
  const latest = new Map<PlatformId, AnalyticsDay>();
  for (const a of analytics) {
    const cur = latest.get(a.platform);
    if (!cur || a.date > cur.date) latest.set(a.platform, a);
  }
  return Array.from(latest.values()).reduce((s, a) => s + a.followers, 0);
}

/** Followers total as of `daysAgo` (nearest row on/before that date, per platform). */
export function followersAsOf(analytics: AnalyticsDay[], daysAgo: number): number {
  const cutoff = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
  const byPlatform = new Map<PlatformId, AnalyticsDay>();
  for (const a of analytics) {
    if (a.date > cutoff) continue;
    const cur = byPlatform.get(a.platform);
    if (!cur || a.date > cur.date) byPlatform.set(a.platform, a);
  }
  return Array.from(byPlatform.values()).reduce((s, a) => s + a.followers, 0);
}
