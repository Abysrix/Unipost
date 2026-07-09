import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditCategory, AuditLogRow, TimelineEntry } from "@/types/admin";

/**
 * Audit log writes always go through the service-role client — logging is
 * infrastructure, not a user self-service action, and some events (login
 * failures, API errors) happen before/outside any authenticated session.
 * Never throws: a failed audit write should never block the action it's
 * describing (same "best-effort" idiom used for XP/history throughout).
 */
export async function logAudit(
  category: AuditCategory,
  eventType: string,
  opts: { actorId?: string | null; targetId?: string | null; message?: string; metadata?: Record<string, unknown>; ip?: string } = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      category,
      event_type: eventType,
      actor_id: opts.actorId ?? null,
      target_id: opts.targetId ?? null,
      message: opts.message ?? null,
      metadata: opts.metadata ?? {},
      ip_address: opts.ip ?? null,
    });
  } catch {
    /* best-effort — never block the caller's real action */
  }
}

const AUDIT_COLS = "id,actor_id,target_id,category,event_type,message,metadata,ip_address,created_at";

export async function listAuditLogs(limit = 100, category?: AuditCategory): Promise<AuditLogRow[]> {
  const supabase = createClient(); // RLS: admin-only select policy enforces access
  let q = supabase.from("audit_logs").select(AUDIT_COLS).order("created_at", { ascending: false }).limit(limit);
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AuditLogRow[];
}

/**
 * The unified admin timeline (Phase 7): composes the new `audit_logs` with
 * activity already tracked by earlier sprints (billing_events, integration_
 * events, sync_logs) instead of duplicating that data into one mega-table.
 */
export async function listUnifiedTimeline(limit = 60): Promise<TimelineEntry[]> {
  const supabase = createClient();
  const per = Math.ceil(limit / 4);

  const [audit, billing, integration, sync] = await Promise.all([
    supabase.from("audit_logs").select("id,category,event_type,message,actor_id,created_at").order("created_at", { ascending: false }).limit(per),
    supabase.from("billing_events").select("id,event_type,message,user_id,created_at").order("created_at", { ascending: false }).limit(per),
    supabase.from("integration_events").select("id,event_type,message,user_id,platform,created_at").order("created_at", { ascending: false }).limit(per),
    supabase.from("sync_logs").select("id,sync_type,status,message,user_id,created_at").order("created_at", { ascending: false }).limit(per),
  ]);

  const entries: TimelineEntry[] = [
    ...((audit.data ?? []) as { id: string; category: string; event_type: string; message: string | null; actor_id: string | null; created_at: string }[]).map((r) => ({
      id: `audit-${r.id}`, source: "audit" as const, category: r.category, title: r.event_type.replace(/_/g, " "), message: r.message, actorId: r.actor_id, createdAt: r.created_at,
    })),
    ...((billing.data ?? []) as { id: string; event_type: string; message: string | null; user_id: string; created_at: string }[]).map((r) => ({
      id: `billing-${r.id}`, source: "billing" as const, category: "billing", title: r.event_type.replace(/_/g, " "), message: r.message, actorId: r.user_id, createdAt: r.created_at,
    })),
    ...((integration.data ?? []) as { id: string; event_type: string; message: string | null; user_id: string; platform: string; created_at: string }[]).map((r) => ({
      id: `integration-${r.id}`, source: "integration" as const, category: r.platform, title: r.event_type.replace(/_/g, " "), message: r.message, actorId: r.user_id, createdAt: r.created_at,
    })),
    ...((sync.data ?? []) as { id: string; sync_type: string; status: string; message: string | null; user_id: string; created_at: string }[]).map((r) => ({
      id: `sync-${r.id}`, source: "sync" as const, category: r.sync_type, title: `sync ${r.status}`, message: r.message, actorId: r.user_id, createdAt: r.created_at,
    })),
  ];

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
