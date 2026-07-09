import type { PlatformId } from "@/config/platforms";

/**
 * Analytics Simulation Service — STUB.
 *
 * There is no live platform API yet (same situation Sprint 5 solved for
 * publishing via a `PlatformPublisher` stub). This generates a plausible,
 * DETERMINISTIC daily time series per platform, seeded by the user id so it's
 * stable across refreshes, and nudged upward on days the user actually
 * published something. It is written ONCE into `analytics_daily` (see
 * lib/db/growth.ts::ensureAnalyticsSeeded) — never recomputed randomly on
 * every page load — so real persistence semantics hold. A future ingestion
 * worker replaces this function; nothing downstream needs to change.
 */

/** Mulberry32 — tiny deterministic PRNG (no dependency). */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

export interface SimulatedDay {
  platform: PlatformId;
  date: string; // YYYY-MM-DD
  followers: number;
  reach: number;
  impressions: number;
  views: number;
  watch_time_min: number;
  profile_visits: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  posts_published: number;
}

const PLATFORM_BASE: Record<PlatformId, number> = {
  instagram: 1400,
  youtube: 900,
  linkedin: 600,
  x: 500,
  facebook: 800,
  threads: 350,
};

/**
 * Generate metrics for an explicit, ordered list of YYYY-MM-DD dates for one
 * platform. `publishDates` are days the user actually published — those get a
 * reach/engagement bump. `startFollowers` continues an existing series (used
 * when extending forward) instead of re-rolling a fresh baseline.
 */
export function simulatePlatformSeries(
  userId: string,
  platform: PlatformId,
  dates: string[],
  publishDates: Set<string>,
  startFollowers?: number,
): SimulatedDay[] {
  const rng = mulberry32(hashSeed(`${userId}:${platform}:${dates[0] ?? ""}`));
  const base = PLATFORM_BASE[platform] ?? 500;
  let followers = startFollowers ?? Math.round(base * (0.6 + rng() * 0.8));

  const out: SimulatedDay[] = [];

  for (const key of dates) {
    const published = publishDates.has(key);

    // Slow organic drift, occasionally negative, with a bump on publish days.
    const drift = Math.round((rng() - 0.42) * (base * 0.01)) + (published ? Math.round(base * 0.006 * (1 + rng())) : 0);
    followers = Math.max(0, followers + drift);

    const activityMult = published ? 1.6 + rng() * 0.8 : 0.5 + rng() * 0.6;
    const reach = Math.round(base * activityMult * (0.8 + rng() * 0.4));
    const impressions = Math.round(reach * (1.15 + rng() * 0.3));
    const engagementRate = 0.02 + rng() * 0.06 + (published ? 0.015 : 0);
    const totalEngagement = Math.round(reach * engagementRate);
    const likes = Math.round(totalEngagement * 0.65);
    const comments = Math.round(totalEngagement * 0.12);
    const shares = Math.round(totalEngagement * 0.13);
    const saves = Math.max(0, totalEngagement - likes - comments - shares);

    out.push({
      platform,
      date: key,
      followers,
      reach,
      impressions,
      views: Math.round(reach * (0.7 + rng() * 0.5)),
      watch_time_min: Math.round(reach * (0.02 + rng() * 0.03)),
      profile_visits: Math.round(reach * (0.01 + rng() * 0.02)),
      likes,
      comments,
      shares,
      saves,
      posts_published: published ? 1 : 0,
    });
  }
  return out;
}

/** Inclusive list of YYYY-MM-DD date keys from `from` to `to`. */
export function dateRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
