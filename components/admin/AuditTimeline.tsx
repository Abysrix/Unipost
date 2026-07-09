import type { TimelineEntry } from "@/types/admin";
import EmptyState from "@/components/dashboard/EmptyState";
import { LogIn } from "lucide-react";
import ActivityFeed from "./ActivityFeed";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

/** Day-grouped view over the unified admin timeline — extends ActivityFeed with date headers rather than re-implementing row rendering. */
export default function AuditTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return <EmptyState icon={LogIn} title="No activity yet" description="Logins, admin actions and platform events will show up here." />;

  const groups: { label: string; items: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">{g.label}</p>
          <ActivityFeed entries={g.items} />
        </div>
      ))}
    </div>
  );
}
