import { resolveAuthForPlatform, fetchJson, listManagedPages, type ResolvedAuth, type ManagedPage } from "@/lib/schedule/publishers/shared";
import type { EngagementPoint, GrowthPoint, NormalizedDailyMetrics, ProviderResult } from "./types";

/**
 * Shared by every analytics provider — the exact same account/token
 * resolution Integration Sprint 3's publishers use (a connected account's
 * OAuth token doesn't care whether it's about to publish or read Insights),
 * so this re-exports rather than duplicates it. `fetchJson`/`listManagedPages`
 * are equally generic — Instagram/Facebook analytics need the same Page
 * lookup publishing does.
 */
export { resolveAuthForPlatform, fetchJson, listManagedPages };
export type { ResolvedAuth, ManagedPage };

/** True when a connection is still Integration Sprint 2's simulated OAuth — analytics sync falls back to `lib/growth/simulate.ts` for these instead of calling a real API with a token no real platform ever issued. */
export function isStubConnection(auth: ResolvedAuth): boolean {
  return auth.isStub;
}

export function resultError<T>(error: string, skipped = false): ProviderResult<T> {
  return { ok: false, error, skipped };
}

/**
 * Engagement is always a slice of the daily metrics every provider already
 * fetched via `fetchAccountMetrics` — computing it here means no provider
 * needs a second network round-trip (or its own copy of this arithmetic)
 * just to satisfy the interface's `fetchEngagementMetrics` method.
 */
export function deriveEngagement(daily: NormalizedDailyMetrics[]): EngagementPoint[] {
  return daily.map((d) => {
    const total = d.likes + d.comments + d.shares + d.saves;
    return { date: d.date, likes: d.likes, comments: d.comments, shares: d.shares, saves: d.saves, engagementRate: d.reach > 0 ? total / d.reach : 0 };
  });
}

/** Same idea as `deriveEngagement` — growth is just consecutive-day deltas over `followers`, not an independent fetch. */
export function deriveGrowth(daily: NormalizedDailyMetrics[]): GrowthPoint[] {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((d, i) => ({ date: d.date, followers: d.followers, delta: i === 0 ? 0 : d.followers - sorted[i - 1].followers }));
}

/** Inclusive YYYY-MM-DD date keys from `from` to `to` — same helper `lib/growth/simulate.ts` uses, duplicated here rather than imported since `lib/growth` and `lib/analytics` are deliberately independent layers (analytics providers shouldn't reach into the simulation stub's module). */
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
