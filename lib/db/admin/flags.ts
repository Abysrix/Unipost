import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "./audit";
import type { FeatureFlag } from "@/types/admin";

const COLS = "id,key,name,description,category,enabled,updated_by,created_at,updated_at";

/** Any signed-in user can read flags (RLS: feature_flags_read_all) — the app checks these at runtime. */
export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("feature_flags").select(COLS).order("category").order("name");
  if (error) throw error;
  return (data ?? []) as unknown as FeatureFlag[];
}

/** Single-flag lookup by key — used by runtime checks like maintenance-mode gating. */
export async function isFlagEnabled(key: string, fallback = false): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    if (error || !data) return fallback;
    return (data as { enabled: boolean }).enabled;
  } catch {
    return fallback;
  }
}

export async function setFeatureFlag(id: string, enabled: boolean, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("feature_flags").update({ enabled, updated_by: actorId }).eq("id", id).select("key,name").single();
  if (error) throw error;
  const flag = data as { key: string; name: string };
  await logAudit("admin_action", "feature_flag_changed", { actorId, message: `${flag.name} ${enabled ? "enabled" : "disabled"}`, metadata: { key: flag.key, enabled } });
}
