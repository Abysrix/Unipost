import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { Plan } from "@/lib/auth/role";

/**
 * Leaf module — just "what plan is this user on," no dependency on posts/
 * schedule/integrations/billing. Callers that need a gate check
 * (`createSchedules`, `completeConnection`) import this instead of
 * `lib/db/billing.ts`, avoiding an import cycle (billing.ts reads schedule +
 * integrations data for usage snapshots; those can't read billing.ts back).
 * Read-only — `lib/db/billing.ts::getOrCreateSubscription` owns row creation.
 */
export async function getCurrentPlan(): Promise<Plan> {
  const user = await getCurrentUser();
  if (!user) return "free";
  const supabase = createClient();
  const { data } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).maybeSingle();
  return (data as { plan: Plan } | null)?.plan ?? "free";
}
