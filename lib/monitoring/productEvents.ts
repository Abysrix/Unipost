import { createAdminClient } from "@/lib/supabase/admin";

/**
 * User journey / product-usage event tracking (LaunchOps Phase 2). One
 * generic sink (product_events, migration 0025) rather than a bespoke
 * table per funnel step — every step is just a name + optional properties,
 * and the funnel-drop-off analysis is a query over this table, not a
 * schema concern. Distinct from lib/notifications/service.ts's notify():
 * that's user-facing (things a creator sees in their own inbox); this is
 * internal-only telemetry an admin queries, never surfaced to the user it's
 * about.
 */
export type ProductEventName =
  | "signup_completed" | "email_verified" | "profile_completed"
  | "account_connected" | "ai_generation_used" | "draft_created"
  | "post_published" | "analytics_viewed" | "subscription_viewed"
  | "upgrade_started" | "upgrade_completed"
  | "onboarding_step_completed" | "feature_used";

export async function logProductEvent(
  eventName: ProductEventName,
  userId: string | null,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("product_events").insert({ user_id: userId, event_name: eventName, properties });
  } catch {
    /* best-effort — telemetry must never break the real action it's observing */
  }
}
