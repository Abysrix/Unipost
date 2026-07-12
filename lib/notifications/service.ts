import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Notification Service — event-driven, per Phase 5. Every real state
 * change worth telling a creator about calls `notify()` directly from the
 * action that caused it (publish success/failure, first real analytics
 * sync, billing events) — this is a fast single insert, not queued work
 * itself. Only email *delivery* goes through the job queue
 * (`notification_delivery`), since that's the slow/unreliable network call
 * worth decoupling from the request that triggered it.
 *
 * Feeds `NotificationBell` (Topbar, Sprint 2) — that component has always
 * existed with an empty-state UI and nothing writing to it; this is that
 * data source, not a new UI feature.
 */

export type NotificationType =
  | "publish_success" | "publish_failure"
  | "analytics_ready"
  | "subscription_upgraded" | "subscription_downgraded" | "payment_failed"
  | "system_alert";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionHref?: string;
  /** Only for events a creator would plausibly want in their inbox, not routine activity — kept opt-in per call site rather than defaulted on, so this doesn't quietly turn into inbox spam. */
  sendEmail?: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_href: string | null;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATION_COLS = "id,type,title,message,action_href,read_at,created_at";

/** RLS-scoped read for the current user — feeds `NotificationBell`. */
export async function listNotifications(limit = 20): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("notifications").select(NOTIFICATION_COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Notification[];
}

export async function unreadNotificationCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function notify(input: NotifyInput): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert({ user_id: input.userId, type: input.type, title: input.title, message: input.message, action_href: input.actionHref ?? null })
    .select("id")
    .single();
  if (error || !data) return; // best-effort — a failed notification write shouldn't break whatever real action triggered it

  if (input.sendEmail) {
    const { data: profile } = await admin.from("profiles").select("email").eq("id", input.userId).maybeSingle();
    const to = (profile as { email: string } | null)?.email;
    if (to) {
      await enqueueJob(
        "notification_delivery",
        { notificationId: (data as { id: string }).id, to, subject: input.title, body: input.message },
        { userId: input.userId },
      ).catch(() => {});
    }
  }
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
