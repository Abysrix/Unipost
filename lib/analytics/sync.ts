import type { PlatformId } from "@/config/platforms";
import type { AnalyticsProvider, AnalyticsSyncResult, PostToSync } from "./providers/types";
import { instagramAnalyticsProvider } from "./providers/instagram";
import { facebookAnalyticsProvider } from "./providers/facebook";
import { linkedinAnalyticsProvider } from "./providers/linkedin";
import { xAnalyticsProvider } from "./providers/x";

/**
 * Registry of real analytics providers — mirrors `lib/schedule/publishing.ts`'s
 * `PlatformPublisher` registry from Integration Sprint 3 exactly, including the
 * direct-Map-literal registration convention. Platforms with no entry here
 * (YouTube, Threads) have no real analytics provider built yet — callers fall
 * back to the existing simulated backfill for those, same as an unregistered
 * platform falls back to `stubPublisher` for publishing.
 */
const registry = new Map<string, AnalyticsProvider>([
  ["instagram", instagramAnalyticsProvider],
  ["facebook", facebookAnalyticsProvider],
  ["linkedin", linkedinAnalyticsProvider],
  ["x", xAnalyticsProvider],
]);

export function getAnalyticsProvider(platform: PlatformId): AnalyticsProvider | null {
  return registry.get(platform) ?? null;
}

/** Run one platform's real sync through its registered provider, normalizing any thrown error into the same result shape a provider would return itself. */
export async function syncPlatformAnalytics(platform: PlatformId, accountId: string, sinceDate: string, posts: PostToSync[]): Promise<AnalyticsSyncResult> {
  const provider = getAnalyticsProvider(platform);
  if (!provider) return { ok: false, error: `No analytics provider registered for ${platform} yet.`, daily: [], posts: [] };
  try {
    return await provider.syncAnalytics(accountId, sinceDate, posts);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Analytics sync failed.", daily: [], posts: [] };
  }
}
