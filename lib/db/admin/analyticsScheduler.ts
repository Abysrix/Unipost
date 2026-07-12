import { createAdminClient } from "@/lib/supabase/admin";
import { syncKnownAccount } from "@/lib/db/analytics";
import type { PlatformId } from "@/config/platforms";

/** How often a connected account's analytics get refreshed by the background worker — engagement numbers don't need publish-worker-level freshness, a few times a day is plenty and keeps this well within every provider's rate limits. */
const SYNC_INTERVAL_HOURS = 6;

interface DueAccount {
  id: string;
  user_id: string;
  platform: PlatformId;
}

/**
 * Background analytics sync — the `processScheduledQueue()` (Integration
 * Sprint 3) of this sprint: finds every connected account overdue for a
 * refresh and syncs it through the same real/simulated routing the
 * interactive path uses (`lib/db/analytics.ts::syncKnownAccount`). No
 * claim-lock needed here the way publishing's queue has one — an analytics
 * sync landing twice for the same account in close succession just
 * re-upserts the same (or marginally newer) numbers, not a duplicate
 * real-world side effect like a second publish would be.
 */
export async function processAnalyticsSyncQueue(): Promise<{ processed: number; succeeded: number; failed: number; simulated: number; skipped: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - SYNC_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("connected_accounts")
    .select("id,user_id,platform")
    .neq("status", "disconnected")
    .or(`last_analytics_sync_at.is.null,last_analytics_sync_at.lt.${cutoff}`);
  if (error) throw error;

  const due = (data ?? []) as unknown as DueAccount[];

  let processed = 0, succeeded = 0, failed = 0, simulated = 0, skipped = 0;
  for (const account of due) {
    processed++;
    const outcome = await syncKnownAccount(account.user_id, account.platform, account.id);
    if (outcome.mode === "real" && outcome.ok) succeeded++;
    else if (outcome.mode === "simulated") simulated++;
    else if (!outcome.ok) failed++;
    else skipped++;
  }

  return { processed, succeeded, failed, simulated, skipped };
}
