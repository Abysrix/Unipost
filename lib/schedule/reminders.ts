import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform } from "@/config/platforms";
import { relativeTo, formatDateTime } from "./timezone";

/**
 * Notification architecture (reusable, no push yet). Reminders are DERIVED from
 * schedule state — a pure function — so any surface (widget, bell, digest email
 * later) can render the same items.
 */
export type ReminderType = "upcoming" | "missed" | "failed" | "published" | "draft";
export type ReminderSeverity = "info" | "success" | "warning" | "danger";

export interface Reminder {
  id: string;
  type: ReminderType;
  severity: ReminderSeverity;
  title: string;
  description: string;
  href: string;
}

const UPCOMING_WINDOW_MS = 24 * 3600_000;
const RECENT_WINDOW_MS = 24 * 3600_000;

function titleOf(e: ScheduledEvent): string {
  return e.post?.title?.trim() || "Untitled post";
}

/** Build the reminder feed from schedule events + a draft count. Pure. */
export function deriveReminders(events: ScheduledEvent[], draftCount = 0, now = Date.now()): Reminder[] {
  const out: Reminder[] = [];

  for (const e of events) {
    const t = new Date(e.scheduled_time).getTime();
    const platform = getPlatform(e.platform)?.name ?? e.platform;

    if (e.status === "failed") {
      out.push({
        id: `failed-${e.id}`,
        type: "failed",
        severity: "danger",
        title: `Publishing failed · ${platform}`,
        description: `${titleOf(e)} — ${e.error ?? "couldn't publish"}. Retry from the queue.`,
        href: "/calendar",
      });
    } else if ((e.status === "scheduled" || e.status === "queued") && t < now) {
      out.push({
        id: `missed-${e.id}`,
        type: "missed",
        severity: "warning",
        title: `Missed schedule · ${platform}`,
        description: `${titleOf(e)} was due ${relativeTo(e.scheduled_time, now)}. Reschedule or publish now.`,
        href: "/calendar",
      });
    } else if ((e.status === "scheduled" || e.status === "queued") && t - now <= UPCOMING_WINDOW_MS) {
      out.push({
        id: `upcoming-${e.id}`,
        type: "upcoming",
        severity: "info",
        title: `Publishing ${relativeTo(e.scheduled_time, now)} · ${platform}`,
        description: `${titleOf(e)} — ${formatDateTime(e.scheduled_time, e.timezone)}.`,
        href: "/calendar",
      });
    } else if (e.status === "published" && e.published_at && now - new Date(e.published_at).getTime() <= RECENT_WINDOW_MS) {
      out.push({
        id: `published-${e.id}`,
        type: "published",
        severity: "success",
        title: `Published · ${platform}`,
        description: `${titleOf(e)} went live ${relativeTo(e.published_at, now)}.`,
        href: "/calendar",
      });
    }
  }

  if (draftCount > 0) {
    out.push({
      id: "draft-reminder",
      type: "draft",
      severity: "info",
      title: `${draftCount} draft${draftCount === 1 ? "" : "s"} waiting`,
      description: "Schedule them so your calendar stays full.",
      href: "/posts",
    });
  }

  // Most urgent first.
  const rank: Record<ReminderSeverity, number> = { danger: 0, warning: 1, success: 2, info: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function reminderCounts(reminders: Reminder[]): Record<ReminderType, number> {
  return reminders.reduce(
    (acc, r) => {
      acc[r.type] += 1;
      return acc;
    },
    { upcoming: 0, missed: 0, failed: 0, published: 0, draft: 0 } as Record<ReminderType, number>,
  );
}
