import type {
  AnalyticsProvider,
  AnalyticsSyncResult,
  AudienceMetrics,
  NormalizedDailyMetrics,
  NormalizedPostMetrics,
  PostToSync,
  ProviderResult,
  SyncedPost,
} from "./types";
import { resolveAuthForPlatform, fetchJson, deriveEngagement, deriveGrowth, resultError } from "./shared";

/**
 * YouTube Data API v3 — real Channel & Video analytics.
 *
 * Uses the YouTube Analytics API (youtubeAnalytics.googleapis.com) for
 * account-level daily time series metrics (views, watch time, subscribers,
 * impressions, reach), and the YouTube Data API (googleapis.com/youtube/v3)
 * for per-video statistics.
 *
 * Known real API limitations:
 * - The YouTube Analytics API requires the `yt-analytics.readonly` OAuth scope.
 *   If the connected account was authorized without this scope the daily metrics
 *   fetch will fail gracefully (not throw) — the provider returns what it can.
 * - `subscribersGained`/`subscribersLost` are not exposed for accounts with
 *   very few subscribers; `views` and `estimatedMinutesWatched` are always
 *   available.
 * - `impressions` and `impressionsClickThroughRate` require the
 *   `yt-analytics-monetary.readonly` scope (Content Owner access), which most
 *   creator-level OAuth connections do not include. The provider attempts the
 *   fetch and silently omits those columns when it fails.
 * - Subscriber count today is always fetched from the Channels endpoint
 *   (accurate real-time), regardless of whether historical daily subscriber
 *   deltas are available.
 */

const YT_ANALYTICS = "https://youtubeanalytics.googleapis.com/v2";
const YT_DATA = "https://www.googleapis.com/youtube/v3";
const MAX_POSTS_PER_SYNC = 25;

interface YtAuth {
  accessToken: string;
  channelId: string;
}

async function resolveYtAuth(accountId: string): Promise<{ auth: YtAuth } | { error: string; skipped?: boolean }> {
  const resolved = await resolveAuthForPlatform("youtube", undefined, accountId);
  if ("result" in resolved) return { error: resolved.result.error ?? "Could not resolve this connection.", skipped: resolved.result.errorCode === "no_connection" };
  if (resolved.auth.isStub) return { error: "Connection is still in simulated OAuth mode.", skipped: true };

  const token = resolved.auth.accessToken;

  // Fetch the authenticated user's channel ID
  const channelRes = await fetchJson(
    `${YT_DATA}/channels?part=id&mine=true&access_token=${encodeURIComponent(token)}`,
    { method: "GET" }
  );
  if (!channelRes.ok) return { error: "Could not retrieve YouTube channel information." };
  const items = (channelRes.data as { items?: { id: string }[] } | null)?.items ?? [];
  if (items.length === 0) return { error: "No YouTube channel found for this connected account." };

  return { auth: { accessToken: token, channelId: items[0].id } };
}

function blankRow(date: string): NormalizedDailyMetrics {
  return { date, followers: 0, reach: 0, impressions: 0, views: 0, watch_time_min: 0, profile_visits: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 };
}

async function fetchAccountMetricsInternal(auth: YtAuth, sinceDate: string): Promise<ProviderResult<NormalizedDailyMetrics[]>> {
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, NormalizedDailyMetrics>();

  // ── 1. YouTube Analytics: daily channel metrics ──────────────────────────
  // views, estimatedMinutesWatched, likes, comments, shares, subscribersGained, subscribersLost
  const coreMetrics = "views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,subscribersLost";
  const analyticsRes = await fetchJson(
    `${YT_ANALYTICS}/reports?ids=channel%3D%3D${auth.channelId}` +
    `&startDate=${sinceDate}&endDate=${today}` +
    `&metrics=${encodeURIComponent(coreMetrics)}` +
    `&dimensions=day` +
    `&sort=day` +
    `&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  if (analyticsRes.ok) {
    const reportData = analyticsRes.data as {
      columnHeaders?: { name: string }[];
      rows?: (string | number)[][];
    } | null;

    const headers = reportData?.columnHeaders?.map((h) => h.name) ?? [];
    const rows = reportData?.rows ?? [];

    const idx = (name: string) => headers.indexOf(name);
    const dayIdx = idx("day");
    const viewsIdx = idx("views");
    const watchTimeIdx = idx("estimatedMinutesWatched");
    const likesIdx = idx("likes");
    const commentsIdx = idx("comments");
    const sharesIdx = idx("shares");
    const subsGainedIdx = idx("subscribersGained");
    const subsLostIdx = idx("subscribersLost");

    for (const row of rows) {
      const date = String(row[dayIdx] ?? "").slice(0, 10);
      if (!date) continue;
      const prev = byDate.get(date) ?? blankRow(date);
      if (viewsIdx >= 0) prev.views = Number(row[viewsIdx]) || 0;
      if (watchTimeIdx >= 0) prev.watch_time_min = Number(row[watchTimeIdx]) || 0;
      if (likesIdx >= 0) prev.likes = Number(row[likesIdx]) || 0;
      if (commentsIdx >= 0) prev.comments = Number(row[commentsIdx]) || 0;
      if (sharesIdx >= 0) prev.shares = Number(row[sharesIdx]) || 0;
      // Net subscriber change for the day: gained – lost
      const gained = subsGainedIdx >= 0 ? Number(row[subsGainedIdx]) || 0 : 0;
      const lost = subsLostIdx >= 0 ? Number(row[subsLostIdx]) || 0 : 0;
      prev.followers = gained - lost; // Will be accumulated into real subscriber count below
      byDate.set(date, prev);
    }
  }

  // ── 2. Impressions (requires yt-analytics-monetary scope) ──────────────
  // Gracefully skip if unavailable — don't block the whole sync
  const impressionRes = await fetchJson(
    `${YT_ANALYTICS}/reports?ids=channel%3D%3D${auth.channelId}` +
    `&startDate=${sinceDate}&endDate=${today}` +
    `&metrics=impressions,impressionsClickThroughRate` +
    `&dimensions=day` +
    `&sort=day` +
    `&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  if (impressionRes.ok) {
    const impData = impressionRes.data as {
      columnHeaders?: { name: string }[];
      rows?: (string | number)[][];
    } | null;
    const impHeaders = impData?.columnHeaders?.map((h) => h.name) ?? [];
    const impRows = impData?.rows ?? [];
    const dayIdx2 = impHeaders.indexOf("day");
    const impIdx = impHeaders.indexOf("impressions");

    for (const row of impRows) {
      const date = String(row[dayIdx2] ?? "").slice(0, 10);
      if (!date) continue;
      const prev = byDate.get(date) ?? blankRow(date);
      if (impIdx >= 0) prev.impressions = Number(row[impIdx]) || 0;
      byDate.set(date, prev);
    }
  }

  // ── 3. Real subscriber count today + total, from Channels endpoint ─────
  // subscribers → stored as `followers`; carry the channel's running total
  const channelRes = await fetchJson(
    `${YT_DATA}/channels?part=statistics&id=${auth.channelId}&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );
  if (channelRes.ok) {
    const stats = (channelRes.data as { items?: { statistics: { subscriberCount: string; viewCount: string } }[] } | null)?.items?.[0]?.statistics;
    if (stats) {
      const totalSubs = parseInt(stats.subscriberCount, 10) || 0;
      // Set today's row to the real total subscriber count
      const todayRow = byDate.get(today) ?? blankRow(today);
      todayRow.followers = totalSubs;
      byDate.set(today, todayRow);

      // Back-fill earlier rows with an estimated cumulative count using the
      // daily net deltas we got from Analytics. Start from today and walk back.
      const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)); // newest first
      let runningCount = totalSubs;
      for (const date of sortedDates) {
        const row = byDate.get(date)!;
        row.followers = Math.max(0, runningCount);
        byDate.set(date, row);
        // The `followers` field currently holds the daily *delta* (gained-lost).
        // Subtract it to get the count at the previous day.
        runningCount = Math.max(0, runningCount - row.followers);
      }

      // Re-set today to the accurate real-time total (the loop may have overridden it)
      const todayRow2 = byDate.get(today) ?? blankRow(today);
      todayRow2.followers = totalSubs;
      byDate.set(today, todayRow2);
    }
  }

  if (byDate.size === 0 && !analyticsRes.ok) {
    return resultError((analyticsRes as { ok: false; result: { error?: string } }).result?.error || "Failed to fetch YouTube Analytics data.");
  }

  return {
    ok: true,
    data: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function fetchPostMetricsInternal(auth: YtAuth, videoId: string): Promise<ProviderResult<NormalizedPostMetrics>> {
  // YouTube Data API v3 — video statistics
  const res = await fetchJson(
    `${YT_DATA}/videos?part=statistics&id=${encodeURIComponent(videoId)}&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );
  if (!res.ok) return resultError(`Failed to fetch video statistics for ${videoId}.`);

  const item = (res.data as { items?: { statistics: Record<string, string> }[] } | null)?.items?.[0];
  if (!item) return resultError(`No statistics found for video ${videoId}.`);

  const s = item.statistics;
  return {
    ok: true,
    data: {
      impressions: 0, // Not available at per-video level via Data API (requires Analytics API per-video which needs Content Owner access)
      reach: parseInt(s.viewCount ?? "0", 10),
      likes: parseInt(s.likeCount ?? "0", 10),
      comments: parseInt(s.commentCount ?? "0", 10),
      shares: 0, // Not available via public Data API
      saves: parseInt(s.favoriteCount ?? "0", 10),
      views: parseInt(s.viewCount ?? "0", 10),
      clicks: 0, // Not available via public Data API
      raw: s as Record<string, unknown>,
    },
  };
}

export const youtubeAnalyticsProvider: AnalyticsProvider = {
  platform: "youtube",

  async fetchAccountMetrics(accountId, sinceDate) {
    const resolved = await resolveYtAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchAccountMetricsInternal(resolved.auth, sinceDate);
  },

  async fetchPostMetrics(accountId, platformPostId) {
    const resolved = await resolveYtAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);
    return fetchPostMetricsInternal(resolved.auth, platformPostId);
  },

  async fetchAudienceMetrics(accountId): Promise<ProviderResult<AudienceMetrics>> {
    const resolved = await resolveYtAuth(accountId);
    if ("error" in resolved) return resultError(resolved.error, resolved.skipped);

    const { accessToken, channelId } = resolved.auth;
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

    // Age/gender breakdown from YouTube Analytics
    const res = await fetchJson(
      `${YT_ANALYTICS}/reports?ids=channel%3D%3D${channelId}` +
      `&startDate=${since}&endDate=${today}` +
      `&metrics=viewerPercentage` +
      `&dimensions=ageGroup,gender` +
      `&access_token=${encodeURIComponent(accessToken)}`,
      { method: "GET" }
    );

    if (!res.ok) return resultError("Audience demographics are not available for this account (requires YouTube Analytics with viewer demographics access).");
    return { ok: true, data: { raw: (res.data as Record<string, unknown>) ?? {} } };
  },

  fetchEngagementMetrics: deriveEngagement,
  fetchGrowthMetrics: deriveGrowth,

  normalizeMetrics(raw, kind) {
    if (kind === "post") {
      const stats = (raw as { statistics?: Record<string, string> })?.statistics ?? {};
      return {
        impressions: 0,
        reach: parseInt(stats.viewCount ?? "0", 10),
        likes: parseInt(stats.likeCount ?? "0", 10),
        comments: parseInt(stats.commentCount ?? "0", 10),
        shares: 0,
        saves: parseInt(stats.favoriteCount ?? "0", 10),
        views: parseInt(stats.viewCount ?? "0", 10),
        clicks: 0,
        raw: stats as Record<string, unknown>,
      };
    }
    // account-level: raw is already a parsed analytics report
    return [];
  },

  async syncAnalytics(accountId, sinceDate, posts: PostToSync[]): Promise<AnalyticsSyncResult> {
    const resolved = await resolveYtAuth(accountId);
    if ("error" in resolved) return { ok: false, error: resolved.error, daily: [], posts: [] };

    const dailyResult = await fetchAccountMetricsInternal(resolved.auth, sinceDate);
    if (!dailyResult.ok) return { ok: false, error: dailyResult.error, daily: [], posts: [] };

    const syncedPosts: SyncedPost[] = [];
    for (const p of posts.slice(0, MAX_POSTS_PER_SYNC)) {
      const postResult = await fetchPostMetricsInternal(resolved.auth, p.platformPostId);
      if (postResult.ok) {
        syncedPosts.push({
          ...postResult.data,
          scheduledPostId: p.scheduledPostId,
          platformPostId: p.platformPostId,
        });
      }
    }

    return { ok: true, daily: dailyResult.data, posts: syncedPosts };
  },
};
