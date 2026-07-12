import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDefaultAccountId } from "@/lib/db/integrations";
import { resolveAuthForPlatform } from "@/lib/schedule/publishers/shared";
import { syncPlatformAnalytics, getAnalyticsProvider } from "@/lib/analytics/sync";
import type { PostToSync } from "@/lib/analytics/providers/types";
import { simulatePlatformSeries, dateRange } from "@/lib/growth/simulate";
import { notify } from "@/lib/notifications/service";
import type { PlatformId } from "@/config/platforms";
import type { PostAnalytics } from "@/types/growth";
import type { PostMedia } from "@/types/post";

const POST_ANALYTICS_COLS = "id,user_id,scheduled_post_id,platform,platform_post_id,impressions,reach,likes,comments,shares,saves,views,clicks,engagement_rate,raw,synced_at,created_at,updated_at";

/** Real per-post metrics for the current user — RLS-scoped read, mirrors `lib/db/growth.ts::listAnalytics`. */
export async function listPostAnalytics(): Promise<PostAnalytics[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("post_analytics").select(POST_ANALYTICS_COLS).order("synced_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PostAnalytics[];
}

/**
 * Real analytics sync — the data layer `lib/analytics/sync.ts`'s provider
 * registry plugs into. Mirrors `lib/db/schedule.ts`'s split from
 * `lib/schedule/publishing.ts`: this file owns persistence (`analytics_daily`,
 * `post_analytics`, `connected_accounts.last_analytics_sync_at`, `sync_logs`),
 * the sync module owns talking to the platform.
 *
 * `analytics_daily`/`post_analytics` are system-computed tables (migration
 * 0014 locked `analytics_daily` to read-only for `authenticated`, same
 * reasoning as `billing_events`) — every write here goes through the
 * service-role client. Every function still takes an explicit `userId`
 * rather than resolving one internally, since this must also run from the
 * session-less cron worker (`lib/db/admin/analyticsScheduler.ts`).
 */

const ANALYTICS_COLS =
  "id,user_id,platform,date,followers,reach,impressions,views,watch_time_min,profile_visits,likes,comments,shares,saves,clicks,posts_published,created_at";

type AdminClient = ReturnType<typeof createAdminClient>;

async function logSync(admin: AdminClient, userId: string, accountId: string, status: "success" | "failed", message: string): Promise<void> {
  await admin.from("sync_logs").insert({ user_id: userId, connected_account_id: accountId, sync_type: "analytics", status, message });
}

/** Backfill (or extend forward to today) *simulated* analytics — the exact behavior `lib/db/growth.ts::ensureAnalyticsSeeded` used to run inline, for platforms with no real connection to sync from yet (no provider built, or the connection is still Integration Sprint 2's simulated OAuth). */
async function simulateBackfillForPlatform(userId: string, platform: PlatformId, publishDates: Set<string>): Promise<void> {
  const admin = createAdminClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: latest } = await admin.from("analytics_daily").select("date,followers").eq("user_id", userId).eq("platform", platform).order("date", { ascending: false }).limit(1).maybeSingle();
  const last = latest as { date: string; followers: number } | null;
  if (last?.date === todayStr) return;

  const from = last ? new Date(new Date(`${last.date}T00:00:00Z`).getTime() + 86_400_000) : new Date(Date.now() - 89 * 86_400_000);
  const dates = dateRange(from, new Date());
  if (dates.length === 0) return;

  const series = simulatePlatformSeries(userId, platform, dates, publishDates, last?.followers);
  const rows = series.map((d) => ({ user_id: userId, clicks: 0, ...d }));
  await admin.from("analytics_daily").upsert(rows, { onConflict: "user_id,platform,date" });
}

interface PublishedRow {
  id: string;
  platform_post_id: string | null;
  published_at: string | null;
  post: { media: PostMedia[] } | null;
}

/** Real sync for one already-resolved, genuinely-connected account. */
async function syncAccountAnalytics(userId: string, platform: PlatformId, accountId: string): Promise<{ ok: boolean; error?: string; dailyRows: number; postRows: number }> {
  const admin = createAdminClient();

  const { data: accountBefore } = await admin.from("connected_accounts").select("last_analytics_sync_at").eq("id", accountId).maybeSingle();
  const isFirstSync = !(accountBefore as { last_analytics_sync_at: string | null } | null)?.last_analytics_sync_at;

  const { data: latest } = await admin.from("analytics_daily").select("date").eq("user_id", userId).eq("platform", platform).order("date", { ascending: false }).limit(1).maybeSingle();
  const sinceDate = (latest as { date: string } | null)?.date ?? new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

  // Posts published through this account since sinceDate — drives both
  // `posts_published` on the daily rows and which posts get a real
  // per-post metrics refresh (capped inside each provider; recently
  // published posts still accrue engagement, so "since sinceDate" doubles
  // as a natural recency window rather than every post ever published).
  const { data: publishedData, error: publishedErr } = await admin
    .from("scheduled_posts")
    .select("id,platform_post_id,published_at,post:posts(media)")
    .eq("user_id", userId)
    .eq("connected_account_id", accountId)
    .eq("status", "published")
    .gte("published_at", `${sinceDate}T00:00:00Z`)
    .order("published_at", { ascending: false })
    .limit(50);
  if (publishedErr) return { ok: false, error: publishedErr.message, dailyRows: 0, postRows: 0 };

  const published = (publishedData ?? []) as unknown as PublishedRow[];
  const publishDates = new Set(published.filter((p) => p.published_at).map((p) => (p.published_at as string).slice(0, 10)));
  const posts: PostToSync[] = published
    .filter((p) => p.platform_post_id)
    .map((p) => ({ scheduledPostId: p.id, platformPostId: p.platform_post_id as string, mediaType: p.post?.media?.[0]?.type }));

  const result = await syncPlatformAnalytics(platform, accountId, sinceDate, posts);
  if (!result.ok) {
    await logSync(admin, userId, accountId, "failed", result.error ?? "Analytics sync failed.");
    return { ok: false, error: result.error, dailyRows: 0, postRows: 0 };
  }

  if (result.daily.length > 0) {
    const rows = result.daily.map((d) => ({ user_id: userId, platform, ...d, posts_published: publishDates.has(d.date) ? 1 : 0 }));
    const { error } = await admin.from("analytics_daily").upsert(rows, { onConflict: "user_id,platform,date" });
    if (error) return { ok: false, error: error.message, dailyRows: 0, postRows: 0 };
  }

  if (result.posts.length > 0) {
    const rows = result.posts.map((p) => {
      const total = p.likes + p.comments + p.shares + p.saves;
      return {
        user_id: userId, scheduled_post_id: p.scheduledPostId, platform, platform_post_id: p.platformPostId,
        impressions: p.impressions, reach: p.reach, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves,
        views: p.views, clicks: p.clicks, engagement_rate: p.reach > 0 ? Math.round((total / p.reach) * 10000) / 10000 : 0,
        raw: p.raw, synced_at: new Date().toISOString(),
      };
    });
    const { error } = await admin.from("post_analytics").upsert(rows, { onConflict: "scheduled_post_id" });
    if (error) return { ok: false, error: error.message, dailyRows: result.daily.length, postRows: 0 };
  }

  await admin.from("connected_accounts").update({ last_analytics_sync_at: new Date().toISOString() }).eq("id", accountId);
  await logSync(admin, userId, accountId, "success", `Synced ${result.daily.length} day(s), ${result.posts.length} post(s).`);

  if (isFirstSync) {
    // Once per connection, not once per sync — a recurring "analytics synced" ping every few hours would be noise, not signal.
    await notify({ userId, type: "analytics_ready", title: "Analytics are ready", message: `Real ${platform} analytics are now syncing. Check your Analytics dashboard for the numbers.`, actionHref: "/analytics" }).catch(() => {});
  }

  return { ok: true, dailyRows: result.daily.length, postRows: result.posts.length };
}

export interface PlatformSyncOutcome {
  platform: PlatformId;
  mode: "real" | "simulated" | "skipped";
  ok: boolean;
  error?: string;
}

/**
 * The single entrypoint `lib/db/growth.ts::ensureAnalyticsSeeded` delegates
 * to — one call per platform the user actually uses, each independently
 * routed to a real sync, the simulated fallback, or skipped (no connection
 * at all yet, nothing to sync). Never throws: a failure on one platform
 * shouldn't block the others or the page load that triggered this.
 */
export async function syncAllAnalytics(userId: string, platforms: PlatformId[], publishDatesByPlatform: Map<PlatformId, Set<string>>): Promise<PlatformSyncOutcome[]> {
  const outcomes: PlatformSyncOutcome[] = [];
  for (const platform of platforms) {
    const accountId = await getDefaultAccountId(platform, userId);
    if (!accountId) {
      outcomes.push({ platform, mode: "skipped", ok: true });
      continue;
    }
    outcomes.push(await syncKnownAccount(userId, platform, accountId, publishDatesByPlatform.get(platform) ?? new Set()));
  }
  return outcomes;
}

/**
 * Same real/simulated/skip routing as `syncAllAnalytics`, for a connected
 * account already known by id — used when the caller already resolved
 * (or, for the cron worker below, is iterating) a specific account rather
 * than "the default one for this platform." Never throws.
 */
export async function syncKnownAccount(userId: string, platform: PlatformId, accountId: string, publishDates: Set<string> = new Set()): Promise<PlatformSyncOutcome> {
  try {
    const provider = getAnalyticsProvider(platform);
    if (!provider) {
      await simulateBackfillForPlatform(userId, platform, publishDates);
      return { platform, mode: "simulated", ok: true };
    }

    const resolved = await resolveAuthForPlatform(platform, userId, accountId);
    if ("result" in resolved) {
      // Real connection exists but token/account resolution failed (expired, revoked, etc.) — log-worthy, but never fabricate data for a broken real connection; leave existing rows as they were.
      return { platform, mode: "skipped", ok: false, error: resolved.result.error };
    }
    if (resolved.auth.isStub) {
      await simulateBackfillForPlatform(userId, platform, publishDates);
      return { platform, mode: "simulated", ok: true };
    }

    const real = await syncAccountAnalytics(userId, platform, accountId);
    return { platform, mode: "real", ok: real.ok, error: real.error };
  } catch (e) {
    return { platform, mode: "skipped", ok: false, error: e instanceof Error ? e.message : "Sync failed." };
  }
}

/** Sync exactly one platform for one user — used right after a new OAuth connection completes (`lib/db/integrations.ts::completeConnection`) and by the interactive "Sync now" action. */
export async function syncAnalyticsForPlatform(userId: string, platform: PlatformId): Promise<PlatformSyncOutcome> {
  const [outcome] = await syncAllAnalytics(userId, [platform], new Map());
  return outcome ?? { platform, mode: "skipped", ok: true };
}
