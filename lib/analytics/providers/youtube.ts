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
 * YouTube Analytics API v2 + Data API v3 — complete real metrics.
 *
 * Metric mapping (YouTube has no exact "reach" or "profile_visits" concept
 * for creator-level OAuth — the best public-API equivalents are used):
 *
 *   followers       -> channel.statistics.subscriberCount (real-time) + daily delta back-fill
 *   views           -> Analytics API `views` (daily)
 *   watch_time_min  -> Analytics API `estimatedMinutesWatched` (daily)
 *   likes           -> Analytics API `likes` (daily)
 *   comments        -> Analytics API `comments` (daily)
 *   shares          -> Analytics API `shares` (daily)
 *   reach           -> Analytics API `views` proxy (YouTube does not expose unique
 *                      viewer count to non-CMS creators; views is the closest signal)
 *   profile_visits  -> Analytics API `cardClicks` (best available proxy)
 *   clicks          -> Analytics API `cardClicks`
 *   impressions     -> Analytics API `impressions` when accessible (yt-analytics-monetary
 *                      scope required; silently 0 for most creator accounts)
 *   saves           -> Analytics API `videosAddedToPlaylists`
 *
 * Per-video metrics use a two-phase fetch:
 *   1. Data API v3 `videos.statistics` — always accessible.
 *   2. Analytics API per-video report — watch time, cardClicks, shares.
 */

const YT_ANALYTICS = "https://youtubeanalytics.googleapis.com/v2";
const YT_DATA = "https://www.googleapis.com/youtube/v3";
const MAX_POSTS_PER_SYNC = 25;

interface YtAuth {
  accessToken: string;
  channelId: string;
}

// ── Auth resolution ───────────────────────────────────────────────────────────

async function resolveYtAuth(accountId: string): Promise<{ auth: YtAuth } | { error: string; skipped?: boolean }> {
  const resolved = await resolveAuthForPlatform("youtube", undefined, accountId);
  if ("result" in resolved) return { error: resolved.result.error ?? "Could not resolve this connection.", skipped: resolved.result.errorCode === "no_connection" };
  if (resolved.auth.isStub) return { error: "Connection is still in simulated OAuth mode.", skipped: true };

  const token = resolved.auth.accessToken;

  const channelRes = await fetchJson(
    `${YT_DATA}/channels?part=id,statistics&mine=true&access_token=${encodeURIComponent(token)}`,
    { method: "GET" }
  );
  if (!channelRes.ok) return { error: "Could not retrieve YouTube channel information. Ensure the yt-analytics.readonly scope is granted." };
  const items = (channelRes.data as { items?: { id: string }[] } | null)?.items ?? [];
  if (items.length === 0) return { error: "No YouTube channel found for this connected account." };

  return { auth: { accessToken: token, channelId: items[0].id } };
}

function blankRow(date: string): NormalizedDailyMetrics {
  return { date, followers: 0, reach: 0, impressions: 0, views: 0, watch_time_min: 0, profile_visits: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 };
}

// ── Analytics API helpers ─────────────────────────────────────────────────────

interface AnalyticsReport {
  columnHeaders?: { name: string }[];
  rows?: (string | number)[][];
}

function parseReport(data: unknown): { headers: string[]; rows: (string | number)[][] } {
  const report = data as AnalyticsReport | null;
  return {
    headers: report?.columnHeaders?.map((h) => h.name) ?? [],
    rows: report?.rows ?? [],
  };
}

function col(headers: string[], name: string): number {
  return headers.indexOf(name);
}

// ── Account-level daily metrics ───────────────────────────────────────────────

async function fetchAccountMetricsInternal(auth: YtAuth, sinceDate: string): Promise<ProviderResult<NormalizedDailyMetrics[]>> {
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, NormalizedDailyMetrics>();

  // ── Phase 1: Core engagement metrics ─────────────────────────────────────
  const coreRes = await fetchJson(
    `${YT_ANALYTICS}/reports?ids=channel%3D%3D${auth.channelId}` +
    `&startDate=${sinceDate}&endDate=${today}` +
    `&metrics=${encodeURIComponent("views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,subscribersLost,videosAddedToPlaylists,cardClicks,averageViewDuration")}` +
    `&dimensions=day&sort=day` +
    `&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  const coreOk = coreRes.ok;
  if (coreOk) {
    const { headers, rows } = parseReport(coreRes.data);
    const iDay        = col(headers, "day");
    const iViews      = col(headers, "views");
    const iWatchTime  = col(headers, "estimatedMinutesWatched");
    const iLikes      = col(headers, "likes");
    const iComments   = col(headers, "comments");
    const iShares     = col(headers, "shares");
    const iSubsGained = col(headers, "subscribersGained");
    const iSubsLost   = col(headers, "subscribersLost");
    const iPlaylists  = col(headers, "videosAddedToPlaylists");
    const iCardClicks = col(headers, "cardClicks");

    for (const row of rows) {
      const date = String(row[iDay] ?? "").slice(0, 10);
      if (!date) continue;
      const r = byDate.get(date) ?? blankRow(date);

      const views      = iViews >= 0      ? Number(row[iViews])      || 0 : 0;
      const watchTime  = iWatchTime >= 0  ? Number(row[iWatchTime])  || 0 : 0;
      const likes      = iLikes >= 0      ? Number(row[iLikes])      || 0 : 0;
      const comments   = iComments >= 0   ? Number(row[iComments])   || 0 : 0;
      const shares     = iShares >= 0     ? Number(row[iShares])     || 0 : 0;
      const gained     = iSubsGained >= 0 ? Number(row[iSubsGained]) || 0 : 0;
      const lost       = iSubsLost >= 0   ? Number(row[iSubsLost])   || 0 : 0;
      const playlists  = iPlaylists >= 0  ? Number(row[iPlaylists])  || 0 : 0;
      const cardClicks = iCardClicks >= 0 ? Number(row[iCardClicks]) || 0 : 0;

      r.views          = views;
      r.watch_time_min = watchTime;
      r.likes          = likes;
      r.comments       = comments;
      r.shares         = shares;
      r.saves          = playlists;
      r.clicks         = cardClicks;
      r.profile_visits = cardClicks;
      r.reach          = views;
      r.followers      = gained - lost;

      byDate.set(date, r);
    }
  }

  // ── Phase 2: Impressions (yt-analytics-monetary scope required) ───────────
  const impRes = await fetchJson(
    `${YT_ANALYTICS}/reports?ids=channel%3D%3D${auth.channelId}` +
    `&startDate=${sinceDate}&endDate=${today}` +
    `&metrics=impressions&dimensions=day&sort=day` +
    `&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  if (impRes.ok) {
    const { headers, rows } = parseReport(impRes.data);
    const iDay2 = col(headers, "day");
    const iImp  = col(headers, "impressions");
    for (const row of rows) {
      const date = String(row[iDay2] ?? "").slice(0, 10);
      if (!date) continue;
      const r = byDate.get(date) ?? blankRow(date);
      if (iImp >= 0) r.impressions = Number(row[iImp]) || 0;
      byDate.set(date, r);
    }
  }

  // ── Phase 3: Real-time subscriber count from Data API ────────────────────
  const channelRes = await fetchJson(
    `${YT_DATA}/channels?part=statistics&id=${auth.channelId}&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  if (channelRes.ok) {
    const stats = (channelRes.data as {
      items?: { statistics: { subscriberCount: string } }[];
    } | null)?.items?.[0]?.statistics;

    if (stats) {
      const totalSubs = parseInt(stats.subscriberCount ?? "0", 10) || 0;

      const todayRow = byDate.get(today) ?? blankRow(today);
      const todayDelta = todayRow.followers;
      todayRow.followers = totalSubs;
      byDate.set(today, todayRow);

      const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
      let running = totalSubs - todayDelta;
      for (const date of sortedDates) {
        if (date === today) continue;
        const r = byDate.get(date)!;
        const delta = r.followers;
        r.followers = Math.max(0, running);
        byDate.set(date, r);
        running = Math.max(0, running - delta);
      }

      const todayRow2 = byDate.get(today)!;
      todayRow2.followers = totalSubs;
      byDate.set(today, todayRow2);
    }
  }

  if (byDate.size === 0 && !coreOk) {
    const errMsg = (!coreRes.ok && (coreRes as { ok: false; result: { error?: string } }).result?.error) || "Failed to fetch YouTube Analytics data. Ensure the yt-analytics.readonly OAuth scope is granted.";
    return resultError(errMsg);
  }

  return {
    ok: true,
    data: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ── Per-video metrics ─────────────────────────────────────────────────────────

async function fetchPostMetricsInternal(auth: YtAuth, videoId: string): Promise<ProviderResult<NormalizedPostMetrics>> {
  // Phase A — Data API v3: always-accessible video statistics
  const dataRes = await fetchJson(
    `${YT_DATA}/videos?part=statistics&id=${encodeURIComponent(videoId)}&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  const baseStats = (dataRes.ok
    ? (dataRes.data as { items?: { statistics: Record<string, string> }[] } | null)?.items?.[0]?.statistics
    : null) ?? {};

  const out: NormalizedPostMetrics = {
    views:       parseInt(baseStats.viewCount     ?? "0", 10),
    reach:       parseInt(baseStats.viewCount     ?? "0", 10),
    likes:       parseInt(baseStats.likeCount     ?? "0", 10),
    comments:    parseInt(baseStats.commentCount  ?? "0", 10),
    saves:       parseInt(baseStats.favoriteCount ?? "0", 10),
    shares:      0,
    impressions: 0,
    clicks:      0,
    raw:         baseStats as Record<string, unknown>,
  };

  // Phase B — Analytics API per-video: watch time, shares, cardClicks
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  const analyticsRes = await fetchJson(
    `${YT_ANALYTICS}/reports?ids=channel%3D%3D${auth.channelId}` +
    `&startDate=${since}&endDate=${today}` +
    `&metrics=${encodeURIComponent("views,estimatedMinutesWatched,likes,comments,shares,cardClicks,videosAddedToPlaylists")}` +
    `&filters=${encodeURIComponent(`video==${videoId}`)}` +
    `&access_token=${encodeURIComponent(auth.accessToken)}`,
    { method: "GET" }
  );

  if (analyticsRes.ok) {
    const { headers, rows } = parseReport(analyticsRes.data);
    const row = rows[0];
    if (row) {
      const iViews     = col(headers, "views");
      const iWatch     = col(headers, "estimatedMinutesWatched");
      const iLikes     = col(headers, "likes");
      const iComments  = col(headers, "comments");
      const iShares    = col(headers, "shares");
      const iClicks    = col(headers, "cardClicks");
      const iPlaylists = col(headers, "videosAddedToPlaylists");

      if (iViews >= 0)     { out.views = Number(row[iViews]) || out.views; out.reach = out.views; }
      if (iWatch >= 0)     out.raw["estimatedMinutesWatched"] = Number(row[iWatch]) || 0;
      if (iLikes >= 0)     out.likes     = Number(row[iLikes])     || out.likes;
      if (iComments >= 0)  out.comments  = Number(row[iComments])  || out.comments;
      if (iShares >= 0)    out.shares    = Number(row[iShares])    || 0;
      if (iClicks >= 0)    out.clicks    = Number(row[iClicks])    || 0;
      if (iPlaylists >= 0) out.saves     = Number(row[iPlaylists]) || out.saves;
    }
  }

  if (!dataRes.ok && !analyticsRes.ok) {
    return resultError(`Could not fetch metrics for video ${videoId}.`);
  }

  return { ok: true, data: out };
}

// ── Provider export ───────────────────────────────────────────────────────────

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

    const [demoRes, trafficRes] = await Promise.all([
      fetchJson(
        `${YT_ANALYTICS}/reports?ids=channel%3D%3D${channelId}` +
        `&startDate=${since}&endDate=${today}` +
        `&metrics=viewerPercentage&dimensions=ageGroup,gender` +
        `&access_token=${encodeURIComponent(accessToken)}`,
        { method: "GET" }
      ),
      fetchJson(
        `${YT_ANALYTICS}/reports?ids=channel%3D%3D${channelId}` +
        `&startDate=${since}&endDate=${today}` +
        `&metrics=views&dimensions=insightTrafficSourceType` +
        `&access_token=${encodeURIComponent(accessToken)}`,
        { method: "GET" }
      ),
    ]);

    if (!demoRes.ok && !trafficRes.ok) {
      return resultError("Audience demographics are not available for this account.");
    }

    return {
      ok: true,
      data: {
        raw: {
          demographics: demoRes.ok ? (demoRes.data as Record<string, unknown>) : null,
          trafficSources: trafficRes.ok ? (trafficRes.data as Record<string, unknown>) : null,
        },
      },
    };
  },

  fetchEngagementMetrics: deriveEngagement,
  fetchGrowthMetrics: deriveGrowth,

  normalizeMetrics(raw, kind) {
    if (kind === "post") {
      const stats = (raw as { statistics?: Record<string, string> })?.statistics ?? {};
      return {
        impressions: 0,
        reach:    parseInt(stats.viewCount     ?? "0", 10),
        likes:    parseInt(stats.likeCount     ?? "0", 10),
        comments: parseInt(stats.commentCount  ?? "0", 10),
        shares:   0,
        saves:    parseInt(stats.favoriteCount ?? "0", 10),
        views:    parseInt(stats.viewCount     ?? "0", 10),
        clicks:   0,
        raw: stats as Record<string, unknown>,
      };
    }
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
