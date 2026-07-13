import type { AnalyticsProvider, AnalyticsSyncResult, AudienceMetrics, NormalizedDailyMetrics, NormalizedPostMetrics, PostToSync, ProviderResult, SyncedPost } from "./types";
import { resolveAuthForPlatform, fetchJson, listManagedPages, deriveEngagement, deriveGrowth, resultError } from "./shared";

/**
 * Facebook Pages API — real Page + post Insights.
 *
 * Same Page-indirection as Sprint 3's Facebook publisher — re-derives the
 * managed Page (and its own access token) via `/me/accounts` on every sync,
 * defaults to the first Page (documented limitation shared with publishing:
 * no per-connection Page picker yet).
 *
 * Reactions/comments/shares are read from the post object's own summary
 * fields (`likes.summary`, `comments.summary`, `shares`) rather than the
 * Insights breakdown metrics — the object fields are the stable, documented
 * way to get exact counts; Insights' `post_reactions_by_type_total` exists
 * too but is meant for reaction-type breakdowns, not a simpler source of
 * truth for a single total.
 *
 * `page_impressions`/`page_fans` deprecated Nov 15, 2025 (replacements:
 * `page_media_view`/`page_follows`); `page_engaged_users`/`page_views_total`
 * (this file's own reach/profile-visits proxies) deprecated even earlier,
 * Mar 14, 2024, with no documented replacement at all. Same for
 * `post_engaged_users`/`post_clicks` at the post level. Dropped rather than
 * guessed at — this codebase's "never fabricate, report what's real" rule.
 * `page_fans`/followers still has a solid fallback regardless: the
 * always-real-time `/{pageId}?fields=followers_count` call a few lines
 * below never depended on the Insights time series to begin with.
 */

const GRAPH = "https://graph.facebook.com/v19.0";
const MAX_POSTS_PER_SYNC = 20;

interface FbAuth {
  pageId: string;
  pageToken: string;
}

async function resolveFbAuth(accountId: string): Promise<{ auth: FbAuth } | { error: string; skipped?: boolean }> {
  const resolved = await resolveAuthForPlatform("facebook", undefined, accountId);
  if ("result" in resolved) return { error: resolved.result.error ?? "Could not resolve this connection.", skipped: resolved.result.errorCode === "no_connection" };
  if (resolved.auth.isStub) return { error: "Connection is still in simulated OAuth mode.", skipped: true };

  const listed = await listManagedPages(resolved.auth.accessToken);
  if ("result" in listed) return { error: listed.result.error ?? "Could not list Facebook Pages." };
  const page = listed.pages[0];
  if (!page) return { error: "No Facebook Page found." };

  return { auth: { pageId: page.id, pageToken: page.access_token } };
}

function blankRow(date: string): NormalizedDailyMetrics {
  return { date, followers: 0, reach: 0, impressions: 0, views: 0, watch_time_min: 0, profile_visits: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 };
}

interface InsightValue { value: number; end_time: string }
interface InsightMetric { name: string; values: InsightValue[] }

async function fetchAccountMetricsInternal(pageId: string, pageToken: string, sinceDate: string): Promise<ProviderResult<NormalizedDailyMetrics[]>> {
  const since = Math.floor(new Date(`${sinceDate}T00:00:00Z`).getTime() / 1000);
  const until = Math.floor(Date.now() / 1000);
  const byDate = new Map<string, NormalizedDailyMetrics>();

  // page_engaged_users/page_views_total dropped — deprecated Mar 2024 with no
  // documented replacement (see file header), so reach/profile_visits are
  // left at their default 0 from this call rather than guessed at.
  const res = await fetchJson(`${GRAPH}/${pageId}/insights?metric=page_media_view,page_follows&period=day&since=${since}&until=${until}&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
  if (res.ok) {
    const metrics = (res.data as { data?: InsightMetric[] } | null)?.data ?? [];
    for (const metric of metrics) {
      for (const point of metric.values) {
        const date = point.end_time.slice(0, 10);
        const row = byDate.get(date) ?? blankRow(date);
        if (metric.name === "page_media_view") row.impressions = point.value;
        else if (metric.name === "page_follows") row.followers = point.value;
        byDate.set(date, row);
      }
    }
  }

  // Always get today's real current fan (follower) count directly, regardless of whether page_fans came back in the time series above.
  const pageRes = await fetchJson(`${GRAPH}/${pageId}?fields=followers_count&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
  if (pageRes.ok) {
    const followers = (pageRes.data as { followers_count?: number } | null)?.followers_count;
    if (typeof followers === "number") {
      const today = new Date().toISOString().slice(0, 10);
      const row = byDate.get(today) ?? blankRow(today);
      row.followers = followers;
      byDate.set(today, row);
    }
  }

  if (byDate.size === 0 && !res.ok) return resultError((!res.ok && res.result.error) || "Failed to fetch Facebook Page insights.");
  return { ok: true, data: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
}

async function fetchPostMetricsInternal(pageToken: string, postId: string): Promise<ProviderResult<NormalizedPostMetrics>> {
  // post_engaged_users/post_clicks dropped, same as their page-level
  // equivalents (no documented replacement). post_media_view is this file's
  // best-effort analogy to page_impressions -> page_media_view — Meta's own
  // deprecated-metrics doc only covered Page-level names directly, so this
  // one specific mapping is an educated guess, not confirmed; if wrong,
  // `insightsRes.ok` below simply stays false and impressions stays 0 same
  // as dropping it outright would — likes/comments/shares (from objRes,
  // the post object's own fields) are entirely unaffected either way.
  const [objRes, insightsRes] = await Promise.all([
    fetchJson(`${GRAPH}/${postId}?fields=shares,comments.summary(true),likes.summary(true)&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" }),
    fetchJson(`${GRAPH}/${postId}/insights?metric=post_media_view&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" }),
  ]);
  if (!objRes.ok) return resultError(objRes.result.error ?? `Failed to fetch post ${postId}.`);

  const obj = objRes.data as { shares?: { count?: number }; comments?: { summary?: { total_count?: number } }; likes?: { summary?: { total_count?: number } } } | null;
  const raw: Record<string, unknown> = { object: obj };
  const out: NormalizedPostMetrics = {
    impressions: 0, reach: 0, views: 0, clicks: 0,
    likes: obj?.likes?.summary?.total_count ?? 0,
    comments: obj?.comments?.summary?.total_count ?? 0,
    shares: obj?.shares?.count ?? 0,
    saves: 0, // Facebook doesn't expose a "saves" count on posts the way Instagram does.
    raw,
  };

  if (insightsRes.ok) {
    const data = (insightsRes.data as { data?: InsightMetric[] } | null)?.data ?? [];
    for (const m of data) {
      const value = m.values[0]?.value ?? 0;
      raw[m.name] = value;
      if (m.name === "post_media_view") out.impressions = value;
    }
  }

  return { ok: true, data: out };
}

export const facebookAnalyticsProvider: AnalyticsProvider = {
  platform: "facebook",

  async fetchAccountMetrics(accountId, sinceDate) {
    const resolved = await resolveFbAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchAccountMetricsInternal(resolved.auth.pageId, resolved.auth.pageToken, sinceDate);
  },

  async fetchPostMetrics(accountId, platformPostId) {
    const resolved = await resolveFbAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchPostMetricsInternal(resolved.auth.pageToken, platformPostId);
  },

  async fetchAudienceMetrics(accountId): Promise<ProviderResult<AudienceMetrics>> {
    const resolved = await resolveFbAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    const res = await fetchJson(`${GRAPH}/${resolved.auth.pageId}/insights?metric=page_fans_gender_age&period=lifetime&access_token=${encodeURIComponent(resolved.auth.pageToken)}`, { method: "GET" });
    if (!res.ok) return resultError("Audience demographics aren't available for this Page (Meta gates this behind a minimum fan count, enforced server-side).");
    return { ok: true, data: { raw: (res.data as Record<string, unknown>) ?? {} } };
  },

  fetchEngagementMetrics: deriveEngagement,
  fetchGrowthMetrics: deriveGrowth,

  normalizeMetrics(raw, kind) {
    if (kind === "post") {
      const obj = raw as { shares?: { count?: number }; comments?: { summary?: { total_count?: number } }; likes?: { summary?: { total_count?: number } } };
      return { impressions: 0, reach: 0, views: 0, clicks: 0, likes: obj?.likes?.summary?.total_count ?? 0, comments: obj?.comments?.summary?.total_count ?? 0, shares: obj?.shares?.count ?? 0, saves: 0, raw: { object: obj } };
    }
    const data = (raw as { data?: InsightMetric[] })?.data ?? [];
    const byDate = new Map<string, NormalizedDailyMetrics>();
    for (const metric of data) {
      for (const point of metric.values) {
        const date = point.end_time.slice(0, 10);
        const row = byDate.get(date) ?? blankRow(date);
        if (metric.name === "page_impressions") row.impressions = point.value;
        else if (metric.name === "page_engaged_users") row.reach = point.value;
        else if (metric.name === "page_fans") row.followers = point.value;
        else if (metric.name === "page_views_total") row.profile_visits = point.value;
        byDate.set(date, row);
      }
    }
    return Array.from(byDate.values());
  },

  async syncAnalytics(accountId, sinceDate, posts: PostToSync[]): Promise<AnalyticsSyncResult> {
    const resolved = await resolveFbAuth(accountId);
    if ("error" in resolved) return { ok: false, error: resolved.error, daily: [], posts: [] };
    const { pageId, pageToken } = resolved.auth;

    const dailyResult = await fetchAccountMetricsInternal(pageId, pageToken, sinceDate);
    if (!dailyResult.ok) return { ok: false, error: dailyResult.error, daily: [], posts: [] };

    const syncedPosts: SyncedPost[] = [];
    for (const p of posts.slice(0, MAX_POSTS_PER_SYNC)) {
      const postResult = await fetchPostMetricsInternal(pageToken, p.platformPostId);
      if (postResult.ok) syncedPosts.push({ ...postResult.data, scheduledPostId: p.scheduledPostId, platformPostId: p.platformPostId });
    }

    return { ok: true, daily: dailyResult.data, posts: syncedPosts };
  },
};
