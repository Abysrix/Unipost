import type { AnalyticsProvider, AnalyticsSyncResult, AudienceMetrics, NormalizedDailyMetrics, NormalizedPostMetrics, PostToSync, ProviderResult, SyncedPost } from "./types";
import { resolveAuthForPlatform, fetchJson, deriveEngagement, deriveGrowth, resultError } from "./shared";

/**
 * X (Twitter) API v2 — real `public_metrics` (and `organic_metrics` where
 * the token has access to them — always true for the tweet's own author,
 * which every synced tweet here is).
 *
 * Real, structural limitation, not a corner cut: X's standard API tier has
 * no historical daily analytics endpoint (that lives behind the separate,
 * more restrictive Analytics/Ads API product) — `fetchAccountMetrics`
 * always returns exactly one row, today's real snapshot, never a backfilled
 * time series. `analytics_daily` still accumulates real history the normal
 * way: one real row gets added every sync from here on.
 */

const API = "https://api.twitter.com/2";
const MAX_POSTS_PER_SYNC = 20;

async function resolveXAuth(accountId: string): Promise<{ accessToken: string } | { error: string; skipped?: boolean }> {
  const resolved = await resolveAuthForPlatform("x", undefined, accountId);
  if ("result" in resolved) return { error: resolved.result.error ?? "Could not resolve this connection.", skipped: resolved.result.errorCode === "no_connection" };
  if (resolved.auth.isStub) return { error: "Connection is still in simulated OAuth mode.", skipped: true };
  return { accessToken: resolved.auth.accessToken };
}

function blankRow(date: string): NormalizedDailyMetrics {
  return { date, followers: 0, reach: 0, impressions: 0, views: 0, watch_time_min: 0, profile_visits: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 };
}

async function fetchAccountMetricsInternal(accessToken: string): Promise<ProviderResult<NormalizedDailyMetrics[]>> {
  const res = await fetchJson(`${API}/users/me?user.fields=public_metrics`, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return resultError(res.result.error ?? "Failed to fetch X account metrics.");

  const metrics = (res.data as { data?: { public_metrics?: { followers_count?: number } } } | null)?.data?.public_metrics;
  const today = new Date().toISOString().slice(0, 10);
  const row = blankRow(today);
  row.followers = metrics?.followers_count ?? 0;
  return { ok: true, data: [row] };
}

interface TweetMetricsResponse {
  data?: { public_metrics?: Record<string, number>; organic_metrics?: Record<string, number> };
}

async function fetchPostMetricsInternal(accessToken: string, tweetId: string): Promise<ProviderResult<NormalizedPostMetrics>> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  // organic_metrics (impression_count, url_link_clicks, user_profile_clicks) requires the caller to be the tweet's own author — always true here — but isn't available on every API access tier, so fall back to public_metrics alone rather than fail the whole sync over one extra field set.
  const rich = await fetchJson(`${API}/tweets/${tweetId}?tweet.fields=public_metrics,organic_metrics`, { method: "GET", headers });
  const res = rich.ok ? rich : await fetchJson(`${API}/tweets/${tweetId}?tweet.fields=public_metrics`, { method: "GET", headers });
  if (!res.ok) return resultError(res.result.error ?? `Failed to fetch tweet ${tweetId}.`);

  const data = (res.data as TweetMetricsResponse | null)?.data;
  const pub = data?.public_metrics ?? {};
  const organic = data?.organic_metrics ?? {};
  const impressions = pub.impression_count ?? organic.impression_count ?? 0;

  return {
    ok: true,
    data: {
      impressions,
      reach: 0, // X doesn't expose a distinct unique-reach metric via the public API — impressions is the closest real signal available.
      likes: pub.like_count ?? 0,
      comments: pub.reply_count ?? 0,
      shares: (pub.retweet_count ?? 0) + (pub.quote_count ?? 0),
      saves: pub.bookmark_count ?? 0,
      views: impressions,
      clicks: organic.url_link_clicks ?? 0,
      raw: { public_metrics: pub, organic_metrics: organic },
    },
  };
}

export const xAnalyticsProvider: AnalyticsProvider = {
  platform: "x",

  async fetchAccountMetrics(accountId) {
    const resolved = await resolveXAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchAccountMetricsInternal(resolved.accessToken);
  },

  async fetchPostMetrics(accountId, platformPostId) {
    const resolved = await resolveXAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchPostMetricsInternal(resolved.accessToken, platformPostId);
  },

  async fetchAudienceMetrics(): Promise<ProviderResult<AudienceMetrics>> {
    return resultError("X's public API doesn't expose audience demographics to third-party apps at any access tier this app uses.");
  },

  fetchEngagementMetrics: deriveEngagement,
  fetchGrowthMetrics: deriveGrowth,

  normalizeMetrics(raw, kind) {
    if (kind === "post") {
      const data = (raw as TweetMetricsResponse)?.data;
      const pub = data?.public_metrics ?? {};
      const organic = data?.organic_metrics ?? {};
      const impressions = pub.impression_count ?? organic.impression_count ?? 0;
      return { impressions, reach: 0, likes: pub.like_count ?? 0, comments: pub.reply_count ?? 0, shares: (pub.retweet_count ?? 0) + (pub.quote_count ?? 0), saves: pub.bookmark_count ?? 0, views: impressions, clicks: organic.url_link_clicks ?? 0, raw: { public_metrics: pub, organic_metrics: organic } };
    }
    const metrics = (raw as { data?: { public_metrics?: { followers_count?: number } } })?.data?.public_metrics;
    const row = blankRow(new Date().toISOString().slice(0, 10));
    row.followers = metrics?.followers_count ?? 0;
    return [row];
  },

  async syncAnalytics(accountId, _sinceDate, posts: PostToSync[]): Promise<AnalyticsSyncResult> {
    const resolved = await resolveXAuth(accountId);
    if ("error" in resolved) return { ok: false, error: resolved.error, daily: [], posts: [] };

    const dailyResult = await fetchAccountMetricsInternal(resolved.accessToken);
    if (!dailyResult.ok) return { ok: false, error: dailyResult.error, daily: [], posts: [] };

    const syncedPosts: SyncedPost[] = [];
    for (const p of posts.slice(0, MAX_POSTS_PER_SYNC)) {
      const postResult = await fetchPostMetricsInternal(resolved.accessToken, p.platformPostId);
      if (postResult.ok) syncedPosts.push({ ...postResult.data, scheduledPostId: p.scheduledPostId, platformPostId: p.platformPostId });
    }

    return { ok: true, daily: dailyResult.data, posts: syncedPosts };
  },
};
