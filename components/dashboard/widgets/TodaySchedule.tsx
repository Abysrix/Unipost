import { CalendarClock } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import EmptyState from "../EmptyState";
import { getPlatform } from "@/config/platforms";
import { formatInZone } from "@/lib/schedule/timezone";
import type { ScheduledEvent } from "@/types/schedule";

/** Today's scheduled posts. Falls back to an empty state when nothing is queued. */
export default function TodaySchedule({ events }: { events: ScheduledEvent[] }) {
  return (
    <WidgetContainer title="Today's Schedule" icon={CalendarClock} action={{ label: "Calendar", href: "/calendar" }}>
      {events.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title="Nothing scheduled" description="Queue a post to keep your streak alive." primary={{ label: "Schedule a post", href: "/create" }} />
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((item) => {
            const p = getPlatform(item.platform);
            const label = item.post?.title?.trim() || "Untitled post";
            const isDraftLike = item.status === "failed";
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                <span className="w-14 shrink-0 font-mono text-[11px] text-white/55">{formatInZone(item.scheduled_time, item.timezone, { hour: "numeric", minute: "2-digit" })}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }}>{p?.glyph}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">{label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${isDraftLike ? "bg-red-500/15 text-red-300" : "bg-aurora-green/15 text-aurora-green"}`}>{item.status}</span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
