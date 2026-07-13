import type { AnalyticsProvider, AnalyticsSyncResult, AudienceMetrics, NormalizedDailyMetrics, NormalizedPostMetrics, PostToSync, ProviderResult, SyncedPost } from "./types";
import { resolveAuthForPlatform, fetchJson, listManagedPages, deriveEngagement, deriveGrowth, resultError, type ManagedPage } from "./shared";

/**
 * Instagram Graph API — real Insights.
 *
 * Same Page-indirection as Sprint 3's Instagram publisher: `connected_accounts.
 * account_id` for Instagram is a Facebook *user* id, so every sync re-derives
 * the linked Page + IG Business Account id via `/me/accounts` rather than
 * trusting anything cached at connect time.
 *
 * Known, real API limitations (not corners cut, genuine platform constraints):
 * - `follower_count` (the only way to get a real historical daily follower
 *   time series) requires the account to have ≥100 followers — Meta simply
 *   doesn't expose it below that threshold. Smaller accounts only ever get a
 *   real follower count for "today" (via the profile's `followers_count`
 *   field); historical days stay whatever they already were before this
 *   sync started (untouched, not fabricated) until enough real days
 *   accumulate.
 * - Meta deprecated `profile_views`/`website_clicks` (account-level) and
 *   `impressions`/`video_views`/`plays` (media-level) effective Jan 8, 2025
 *   (Graph API v21+); `impressions` fully gone everywhere by Apr 21, 2025.
 *   Media-level has a confirmed successor (`views`, requested below for
 *   video media). Account-level does not — Meta's own current user-insights
 *   reference lists no profile-views/visits-equivalent metric at that
 *   endpoint at all, so `profile_visits`/`clicks` are left at their default
 *   0 here rather than guessing a replacement metric name that might not
 *   exist or might carry different semantics (same "never fabricate, report
 *   what's real" rule this file already follows for `follower_count`).
 *   Re-verify against developers.facebook.com/docs/instagram-platform if
 *   Meta adds an account-level equivalent later.
 * - Audience demographics require `engaged_audience_demographics`/
 *   `follower_demographics` breakdown metrics, gated behind a minimum
 *   follower count Meta doesn't publish a fixed number for and enforces
 *   server-side — `fetchAudienceMetrics` surfaces whatever the API accepts
 *   and reports a clear error otherwise, never a guessed breakdown.
 */

const GRAPH = "https://graph.facebook.com/v19.0";
const MAX_POSTS_PER_SYNC = 20;

type IgPage = ManagedPage & { instagram_business_account: { id: string } };

interface IgAuth {
  igUserId: string;
  pageToken: string;
}

async function resolveIgAuth(accountId: string): Promise<{ auth: IgAuth } | { error: string; skipped?: boolean }> {
  const resolved = await resolveAuthForPlatform("instagram", undefined, accountId);
  if ("result" in resolved) return { error: resolved.result.error ?? "Could not resolve this connection.", skipped: resolved.result.errorCode === "no_connection" };
  if (resolved.auth.isStub) return { error: "Connection is still in simulated OAuth mode.", skipped: true };

  const listed = await listManagedPages(resolved.auth.accessToken);
  if ("result" in listed) return { error: listed.result.error ?? "Could not list Facebook Pages." };
  const withIg = listed.pages.find((p): p is IgPage => Boolean(p.instagram_business_account?.id));
  if (!withIg) return { error: "No Instagram Business/Creator account found on any managed Page." };

  return { auth: { igUserId: withIg.instagram_business_account.id, pageToken: withIg.access_token } };
}

function blankRow(date: string): NormalizedDailyMetrics {
  return { date, followers: 0, reach: 0, impressions: 0, views: 0, watch_time_min: 0, profile_visits: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 };
}

interface InsightValue { value: number; end_time: string }
interface InsightMetric { name: string; values: InsightValue[] }

async function fetchAccountMetricsInternal(igUserId: string, pageToken: string, sinceDate: string): Promise<ProviderResult<NormalizedDailyMetrics[]>> {
  const since = Math.floor(new Date(`${sinceDate}T00:00:00Z`).getTime() / 1000);
  const until = Math.floor(Date.now() / 1000);
  const byDate = new Map<string, NormalizedDailyMetrics>();

  // reach: real historical daily time series, available regardless of follower
  // count. profile_views/website_clicks were dropped — deprecated Jan 2025
  // with no confirmed account-level successor (see the file's top comment).
  const res = await fetchJson(`${GRAPH}/${igUserId}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
  if (res.ok) {
    const metrics = (res.data as { data?: InsightMetric[] } | null)?.data ?? [];
    for (const metric of metrics) {
      for (const point of metric.values) {
        const date = point.end_time.slice(0, 10);
        const row = byDate.get(date) ?? blankRow(date);
        if (metric.name === "reach") row.reach = point.value;
        byDate.set(date, row);
      }
    }
  }

  // follower_count: real historical time series, but only exposed for accounts with >=100 followers.
  const followerRes = await fetchJson(`${GRAPH}/${igUserId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
  if (followerRes.ok) {
    const metrics = (followerRes.data as { data?: InsightMetric[] } | null)?.data ?? [];
    for (const metric of metrics) {
      for (const point of metric.values) {
        const date = point.end_time.slice(0, 10);
        const row = byDate.get(date) ?? blankRow(date);
        row.followers = point.value;
        byDate.set(date, row);
      }
    }
  }

  // Always get today's real current follower count directly, regardless of whether the insights metric above was available — the one number every account, large or small, can always get.
  const profileRes = await fetchJson(`${GRAPH}/${igUserId}?fields=followers_count&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
  if (profileRes.ok) {
    const followers = (profileRes.data as { followers_count?: number } | null)?.followers_count;
    if (typeof followers === "number") {
      const today = new Date().toISOString().slice(0, 10);
      const row = byDate.get(today) ?? blankRow(today);
      row.followers = followers;
      byDate.set(today, row);
    }
  }

  if (byDate.size === 0 && !res.ok) return resultError((!res.ok && res.result.error) || "Failed to fetch Instagram account insights.");
  return { ok: true, data: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
}

async function fetchPostMetricsInternal(igUserId: string, pageToken: string, mediaId: string, mediaType?: "image" | "video"): Promise<ProviderResult<NormalizedPostMetrics>> {
  // impressions/plays/video_views deprecated (see file header) — views is the
  // confirmed current media-level successor, requested only for video since
  // that's where plays/video_views used to apply (not widening scope to
  // images without confirming Meta actually returns `views` for that type).
  const metrics = mediaType === "video" ? "reach,likes,comments,saved,shares,views" : "reach,likes,comments,saved,shares";
  const res = await fetchJson(`${GRAPH}/${mediaId}/insights?metric=${metrics}&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
  if (!res.ok) return resultError(res.result.error ?? `Failed to fetch insights for media ${mediaId}.`);

  const raw: Record<string, unknown> = {};
  const out: NormalizedPostMetrics = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, views: 0, clicks: 0, raw };
  const data = (res.data as { data?: InsightMetric[] } | null)?.data ?? [];
  for (const m of data) {
    const value = m.values[0]?.value ?? 0;
    raw[m.name] = value;
    if (m.name === "reach") out.reach = value;
    else if (m.name === "likes") out.likes = value;
    else if (m.name === "comments") out.comments = value;
    else if (m.name === "saved") out.saves = value;
    else if (m.name === "shares") out.shares = value;
    else if (m.name === "views") out.views = value;
  }
  return { ok: true, data: out };
}

export const instagramAnalyticsProvider: AnalyticsProvider = {
  platform: "instagram",

  async fetchAccountMetrics(accountId, sinceDate) {
    const resolved = await resolveIgAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchAccountMetricsInternal(resolved.auth.igUserId, resolved.auth.pageToken, sinceDate);
  },

  async fetchPostMetrics(accountId, platformPostId) {
    const resolved = await resolveIgAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchPostMetricsInternal(resolved.auth.igUserId, resolved.auth.pageToken, platformPostId);
  },

  async fetchAudienceMetrics(accountId): Promise<ProviderResult<AudienceMetrics>> {
    const resolved = await resolveIgAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    const res = await fetchJson(`${GRAPH}/${resolved.auth.igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=age,gender&access_token=${encodeURIComponent(resolved.auth.pageToken)}`, { method: "GET" });
    if (!res.ok) return resultError("Audience demographics aren't available for this account (requires a minimum follower count Meta enforces server-side, not something this app can bypass).");
    return { ok: true, data: { raw: (res.data as Record<string, unknown>) ?? {} } };
  },

  fetchEngagementMetrics: deriveEngagement,
  fetchGrowthMetrics: deriveGrowth,

  normalizeMetrics(raw, kind) {
    if (kind === "post") {
      const data = (raw as { data?: InsightMetric[] })?.data ?? [];
      const out: NormalizedPostMetrics = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, views: 0, clicks: 0, raw: {} };
      for (const m of data) {
        const value = m.values[0]?.value ?? 0;
        out.raw[m.name] = value;
        if (m.name === "impressions") out.impressions = value;
        else if (m.name === "reach") out.reach = value;
        else if (m.name === "likes") out.likes = value;
        else if (m.name === "comments") out.comments = value;
        else if (m.name === "saved") out.saves = value;
        else if (m.name === "shares") out.shares = value;
      }
      return out;
    }
    const data = (raw as { data?: InsightMetric[] })?.data ?? [];
    const byDate = new Map<string, NormalizedDailyMetrics>();
    for (const metric of data) {
      for (const point of metric.values) {
        const date = point.end_time.slice(0, 10);
        const row = byDate.get(date) ?? blankRow(date);
        if (metric.name === "reach") row.reach = point.value;
        else if (metric.name === "profile_views") row.profile_visits = point.value;
        else if (metric.name === "website_clicks") row.clicks = point.value;
        else if (metric.name === "follower_count") row.followers = point.value;
        byDate.set(date, row);
      }
    }
    return Array.from(byDate.values());
  },

  async syncAnalytics(accountId, sinceDate, posts: PostToSync[]): Promise<AnalyticsSyncResult> {
    const resolved = await resolveIgAuth(accountId);
    if ("error" in resolved) return { ok: false, error: resolved.error, daily: [], posts: [] };
    const { igUserId, pageToken } = resolved.auth;

    const dailyResult = await fetchAccountMetricsInternal(igUserId, pageToken, sinceDate);
    if (!dailyResult.ok) return { ok: false, error: dailyResult.error, daily: [], posts: [] };

    const syncedPosts: SyncedPost[] = [];
    for (const p of posts.slice(0, MAX_POSTS_PER_SYNC)) {
      const postResult = await fetchPostMetricsInternal(igUserId, pageToken, p.platformPostId, p.mediaType);
      if (postResult.ok) syncedPosts.push({ ...postResult.data, scheduledPostId: p.scheduledPostId, platformPostId: p.platformPostId });
    }

    return { ok: true, daily: dailyResult.data, posts: syncedPosts };
  },
};
