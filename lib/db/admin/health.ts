import { createAdminClient } from "@/lib/supabase/admin";
import { computeHealthChecks } from "@/lib/admin/health-checks";
import type { HealthCheck } from "@/types/admin";

const LABELS: Record<string, string> = Object.fromEntries(computeHealthChecks().map((c) => [c.component, c.label]));

/** Latest stored health snapshot (upserted whenever `runHealthCheck` is called). */
export async function getStoredHealth(): Promise<HealthCheck[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("platform_health").select("component,status,message,latency_ms,checked_at");
  if (error) throw error;
  const rows = (data ?? []) as { component: string; status: HealthCheck["status"]; message: string; latency_ms: number | null; checked_at: string }[];
  if (rows.length === 0) return [];
  return rows.map((r) => ({ component: r.component, label: LABELS[r.component] ?? r.component, status: r.status, message: r.message, latencyMs: r.latency_ms ?? undefined }));
}

/** Runs the config-presence checks and persists the snapshot. Manual/opt-in — never a live ping on every page load. */
export async function runHealthCheck(): Promise<HealthCheck[]> {
  const admin = createAdminClient();
  const start = Date.now();
  const checks = computeHealthChecks();
  const latency = Date.now() - start;

  await admin.from("platform_health").upsert(
    checks.map((c) => ({ component: c.component, status: c.status, message: c.message, latency_ms: latency, checked_at: new Date().toISOString() })),
    { onConflict: "component" },
  );
  await admin.from("system_events").insert({
    component: "platform_health",
    event_type: "health_check_run",
    status: checks.some((c) => c.status === "critical") ? "critical" : checks.some((c) => c.status === "warning") ? "warning" : "healthy",
    message: `Checked ${checks.length} components`,
  });

  return checks;
}

export async function listSystemEvents(limit = 50): Promise<{ id: string; component: string; event_type: string; status: string | null; message: string | null; created_at: string }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("system_events").select("id,component,event_type,status,message,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
