import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely. Two legitimate uses in
 * this codebase: (1) writing `app_metadata.plan` via the Admin Auth API, which
 * a user's own session can never do (by design — `app_metadata` is
 * authorization-relevant and not self-editable), and (2) the Razorpay webhook,
 * which arrives with no UniPost session at all, so RLS's `auth.uid() = user_id`
 * policies can't apply — the handler must look records up by
 * `razorpay_order_id`/`payment_id` instead of by session.
 *
 * NEVER import this into client code or expose it outside trusted server paths.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Sync the cheap, synchronously-read plan cache (`app_metadata.plan`) after a real plan change. */
export async function syncPlanMetadata(userId: string, plan: "free" | "pro" | "agency"): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  const appMeta = (existing.user?.app_metadata as Record<string, unknown> | undefined) ?? {};
  await admin.auth.admin.updateUserById(userId, { app_metadata: { ...appMeta, plan } });
}
