import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/getUser";
import { XP_AWARDS, type XpReason } from "@/lib/growth/xp";
import type { XpEvent } from "@/types/growth";

/**
 * XP data layer — kept as its own leaf module (no dependency on schedule/ai/growth
 * data layers) so `awardXp` can be called from real-time trigger points
 * (publishNow, runAction) without creating an import cycle with lib/db/growth.ts.
 */

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "23505";

export async function listXpEvents(limit = 100): Promise<XpEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("xp_history").select("id,user_id,amount,reason,meta,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as XpEvent[];
}

export async function getTotalXp(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.from("xp_history").select("amount");
  if (error) throw error;
  return ((data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
}

/**
 * Award XP for a real action. `key` (if given) makes it idempotent — safe to
 * call repeatedly (e.g. once per post, once per calendar day). Best-effort: a
 * caller in a mutation's success path should swallow errors from this, the
 * same way Sprint 4's `runAction` treats history writes as best-effort.
 */
export async function awardXp(reason: XpReason, key?: string, meta: Record<string, unknown> = {}): Promise<void> {
  const admin = createAdminClient();
  const userId = await uid();
  try {
    const { error } = await admin.from("xp_history").insert({
      user_id: userId,
      amount: XP_AWARDS[reason],
      reason,
      meta: key ? { ...meta, key } : meta,
    });
    if (error && !isUniqueViolation(error)) throw error;
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
  }
}

/**
 * Admin-level XP award for background tasks (e.g. cron schedule publishing).
 * Uses the service-role client and directly accepts a target userId.
 */
export async function adminAwardXp(userId: string, reason: XpReason, key?: string, meta: Record<string, unknown> = {}): Promise<void> {
  const admin = createAdminClient();
  try {
    const { error } = await admin.from("xp_history").insert({
      user_id: userId,
      amount: XP_AWARDS[reason],
      reason,
      meta: key ? { ...meta, key } : meta,
    });
    if (error && !isUniqueViolation(error)) throw error;
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
  }
}
