import type { PlatformId } from "@/config/platforms";

/**
 * Analytics Provider Layer — the abstraction every platform's real Insights/
 * Analytics API plugs into, mirroring `lib/schedule/publishing.ts`'s
 * `PlatformPublisher` pattern from Integration Sprint 3. One `AnalyticsProvider`
 * per platform, registered once in `lib/analytics/sync.ts`. No platform-specific
 * branching happens anywhere else — `lib/db/analytics.ts` only ever talks to
 * this interface.
 */

/** The shape every platform's daily numbers get mapped onto — matches `analytics_daily` 1:1 so persistence is a straight upsert, no translation layer at the DB boundary. */
export interface NormalizedDailyMetrics {
  /** YYYY-MM-DD */
  date: string;
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
  clicks: number;
}

/** One post's real metrics — matches `post_analytics` 1:1 for the same reason. */
export interface NormalizedPostMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  clicks: number;
  /** Full provider response, kept for anything the normalized columns don't capture — same idea as `publishing_logs.metadata`. */
  raw: Record<string, unknown>;
}

/** Engagement is always a slice of the same daily metrics every provider already fetches — computed, never a second network round-trip against the platform. */
export interface EngagementPoint {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
}

/** Growth is the same — a derived view over consecutive days' `followers`, not an independent fetch. */
export interface GrowthPoint {
  date: string;
  followers: number;
  /** Change vs. the previous point in the same series; 0 for the first point. */
  delta: number;
}

/** Demographics/audience breakdown — genuinely sparse: most platforms either don't expose this to third-party apps at all, or gate it behind a higher API tier / minimum follower count. Providers that can't get this return `{ ok: false }` with a clear reason rather than fabricating a breakdown. */
export interface AudienceMetrics {
  raw: Record<string, unknown>;
}

export type ProviderResult<T> = { ok: true; data: T } | { ok: false; error: string; skipped?: boolean };

export interface PostToSync {
  scheduledPostId: string;
  platformPostId: string;
  /** Some platforms request a different metric set for video vs. image posts (Instagram/Facebook) — sourced from the post's own media, sparing each provider from a second lookup to learn it. */
  mediaType?: "image" | "video";
}

export interface SyncedPost extends NormalizedPostMetrics {
  scheduledPostId: string;
  platformPostId: string;
}

export interface AnalyticsSyncResult {
  ok: boolean;
  error?: string;
  daily: NormalizedDailyMetrics[];
  posts: SyncedPost[];
  audience?: AudienceMetrics;
}

export interface AnalyticsProvider {
  platform: PlatformId;

  /** Real account-level insights (followers, reach, impressions, profile visits, clicks, ...) from `sinceDate` to today. */
  fetchAccountMetrics(accountId: string, sinceDate: string): Promise<ProviderResult<NormalizedDailyMetrics[]>>;

  /** Real per-post insights for one already-published post. */
  fetchPostMetrics(accountId: string, platformPostId: string): Promise<ProviderResult<NormalizedPostMetrics>>;

  /** Real audience/demographics breakdown, where the platform exposes one to this app's API access level. */
  fetchAudienceMetrics(accountId: string): Promise<ProviderResult<AudienceMetrics>>;

  /** Derived, not fetched — see `EngagementPoint`'s doc comment. Every provider can use the shared `lib/analytics/providers/shared.ts::deriveEngagement` implementation. */
  fetchEngagementMetrics(daily: NormalizedDailyMetrics[]): EngagementPoint[];

  /** Derived, not fetched — see `GrowthPoint`'s doc comment. Every provider can use the shared `deriveGrowth` implementation. */
  fetchGrowthMetrics(daily: NormalizedDailyMetrics[]): GrowthPoint[];

  /** Maps one raw provider API response onto the normalized shape. Exposed as its own method (not just inlined in the fetch call) so it's independently testable/debuggable. */
  normalizeMetrics(raw: unknown, kind: "account" | "post"): NormalizedDailyMetrics[] | NormalizedPostMetrics;

  /**
   * Orchestrates the above into one real sync pass: account metrics since
   * `sinceDate`, plus per-post metrics for every entry in `posts` (capped —
   * see each provider for its own batch limit, keeps one sync run from
   * blowing through a platform's rate limit on an account with a long
   * publish history).
   */
  syncAnalytics(accountId: string, sinceDate: string, posts: PostToSync[]): Promise<AnalyticsSyncResult>;
}
