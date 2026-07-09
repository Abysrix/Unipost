import { CalendarClock } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import EmptyState from "../EmptyState";
import { getPlatform } from "@/config/platforms";
import { todaySchedule } from "@/lib/mock/dashboard";

/** Today's scheduled posts. Falls back to an empty state when nothing is queued. */
export default function TodaySchedule() {
  return (
    <WidgetContainer title="Today's Schedule" icon={CalendarClock} action={{ label: "Calendar", href: "/calendar" }}>
      {todaySchedule.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title="Nothing scheduled" description="Queue a post to keep your streak alive." primary={{ label: "Schedule a post", href: "/create" }} />
      ) : (
        <ul className="flex flex-col gap-2">
          {todaySchedule.map((item, i) => {
            const p = getPlatform(item.platform);
            return (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                <span className="w-10 shrink-0 font-mono text-[11px] text-white/40">{item.time}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }}>{p?.glyph}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">{item.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${item.status === "scheduled" ? "bg-aurora-green/15 text-aurora-green" : "bg-white/[0.06] text-white/40"}`}>{item.status}</span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
