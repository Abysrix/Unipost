import type { AnalyticsProvider, AnalyticsSyncResult, AudienceMetrics, NormalizedDailyMetrics, NormalizedPostMetrics, ProviderResult } from "./types";
import { deriveEngagement, deriveGrowth, resultError } from "./shared";

/**
 * LinkedIn — real API access genuinely doesn't cover this app's use case.
 *
 * Sprint 3's LinkedIn publisher posts as a *personal profile*
 * (`urn:li:person:{id}`, via the UGC Posts API — the only publishing surface
 * LinkedIn's standard OAuth apps get). LinkedIn's analytics endpoints
 * (`organizationalEntityShareStatistics`, `organizationPageStatistics`) only
 * report on *Organization* (Company Page) entities, and even those require
 * the Marketing Developer Platform partnership — a separate approval
 * program most apps, including this one, don't have. There is no public
 * LinkedIn API that returns a personal profile's own post impressions,
 * reactions, or follower counts to a third-party app at all; that data is
 * only ever shown to the member inside LinkedIn's own UI.
 *
 * Per this sprint's explicit instruction ("do not estimate metrics, do not
 * generate fake analytics"), this provider does not fall back to a
 * simulated number for a real connection — it returns a clear, honest
 * "not supported" result on every method. `syncAnalytics` reports success
 * with zero rows (not an error) so a scheduled sync run doesn't treat
 * "LinkedIn has nothing to give us" as a failure needing retry — there's
 * nothing a retry would ever fix here.
 */

const UNAVAILABLE = "LinkedIn's public API doesn't expose personal-profile analytics to third-party apps — this is a real platform restriction (Organization/Company Page analytics require a separate Marketing Developer Platform partnership this app doesn't have), not a missing feature.";

export const linkedinAnalyticsProvider: AnalyticsProvider = {
  platform: "linkedin",

  async fetchAccountMetrics(): Promise<ProviderResult<NormalizedDailyMetrics[]>> {
    return resultError(UNAVAILABLE, true);
  },

  async fetchPostMetrics(): Promise<ProviderResult<NormalizedPostMetrics>> {
    return resultError(UNAVAILABLE, true);
  },

  async fetchAudienceMetrics(): Promise<ProviderResult<AudienceMetrics>> {
    return resultError(UNAVAILABLE, true);
  },

  fetchEngagementMetrics: deriveEngagement,
  fetchGrowthMetrics: deriveGrowth,

  normalizeMetrics(): NormalizedDailyMetrics[] {
    return [];
  },

  async syncAnalytics(): Promise<AnalyticsSyncResult> {
    return { ok: true, daily: [], posts: [] };
  },
};
