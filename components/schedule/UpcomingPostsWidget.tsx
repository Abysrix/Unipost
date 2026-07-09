"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import EmptyState from "@/components/dashboard/EmptyState";
import { getPlatform } from "@/config/platforms";
import { formatInZone, relativeTo } from "@/lib/schedule/timezone";
import type { ScheduledEvent } from "@/types/schedule";
import { StatusDot } from "./PublishingStatus";

/** Reusable "what's publishing next" list. Used on the calendar + dashboard. */
export default function UpcomingPostsWidget({ events, limit = 6 }: { events: ScheduledEvent[]; limit?: number }) {
  const upcoming = [...events]
    .filter((e) => e.status === "scheduled" || e.status === "queued")
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
    .slice(0, limit);

  return (
    <WidgetContainer title="Upcoming" icon={CalendarClock} action={{ label: "Calendar", href: "/calendar" }}>
      {upcoming.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title="Nothing scheduled" description="Queue a post to keep your streak alive." primary={{ label: "Schedule", href: "/calendar" }} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {upcoming.map((e) => {
            const p = getPlatform(e.platform);
            return (
              <li key={e.id}>
                <Link href={`/create?id=${e.post_id}`} className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:border-white/[0.1]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }}>{p?.glyph}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-white/80">{e.post?.title?.trim() || "Untitled post"}</span>
                    <span className="block font-mono text-[10px] text-white/35">{formatInZone(e.scheduled_time, e.timezone, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <StatusDot status={e.status} />
                    <span className="font-mono text-[10px] text-aurora-teal">{relativeTo(e.scheduled_time)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
