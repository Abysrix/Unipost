import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `ai_context_cache` read/write, split out from `lib/ai/context.ts` as a
 * leaf module with no dependencies on the rest of `lib/db/*` — the same
 * "small leaf module to avoid import cycles" pattern `lib/db/plan.ts`/
 * `lib/db/xp.ts` already use (see ARCHITECTURE.md). `context.ts` itself
 * imports from most of `lib/db/*` to build a fresh context; several of
 * those same modules (`lib/db/schedule.ts::publishNow`, `lib/db/
 * integrations.ts::completeConnection`) need to invalidate the cache after
 * a write. Importing `invalidateCreatorContext` from the *heavy* aggregator
 * would make that a real two-file cycle; importing it from here doesn't.
 */

export const CONTEXT_VERSION = 1;
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export async function getCachedContext<T>(userId: string): Promise<T | null> {
  const supabase = createClient();
  const { data } = await supabase.from("ai_context_cache").select("context,context_version,expires_at").eq("user_id", userId).maybeSingle();
  const row = data as { context: T; context_version: number; expires_at: string } | null;
  if (row && row.context_version === CONTEXT_VERSION && new Date(row.expires_at).getTime() > Date.now()) return row.context;
  return null;
}

export async function setCachedContext<T>(userId: string, context: T, computedAt: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("ai_context_cache").upsert(
    { user_id: userId, context_version: CONTEXT_VERSION, context, computed_at: computedAt, expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString() },
    { onConflict: "user_id" },
  );
}

/** Invalidate immediately — called after an action that meaningfully changes context (a publish, a new connection) so the next AI call isn't stuck with stale data for up to `CACHE_TTL_MS`. Best-effort. */
export async function invalidateCreatorContext(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_context_cache").delete().eq("user_id", userId);
  } catch {
    /* best-effort */
  }
}
