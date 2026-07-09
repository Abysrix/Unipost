import { Link2, CreditCard, RefreshCw, Shield, AlertCircle, LogIn } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import EmptyState from "@/components/dashboard/EmptyState";
import type { TimelineEntry } from "@/types/admin";

const SOURCE_META: Record<TimelineEntry["source"], { icon: LucideIcon; accent: string }> = {
  audit: { icon: Shield, accent: "#facc15" },
  billing: { icon: CreditCard, accent: "#34d399" },
  integration: { icon: Link2, accent: "#22d3ee" },
  sync: { icon: RefreshCw, accent: "#2dd4bf" },
};

/** Reusable event-list surface — the admin overview's live feed and the audit page's timeline both use it. */
export default function ActivityFeed({ entries, compact = false }: { entries: TimelineEntry[]; compact?: boolean }) {
  if (entries.length === 0) return <EmptyState compact icon={LogIn} title="No activity yet" description="Logins, admin actions and platform events will show up here." />;

  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((e) => {
        const meta = SOURCE_META[e.source] ?? { icon: AlertCircle, accent: "#71717a" };
        const Icon = meta.icon;
        return (
          <li key={e.id} className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${meta.accent}1f`, color: meta.accent }}>
              <Icon size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] capitalize text-white/80">{e.title}</p>
              {!compact && e.message && <p className="truncate text-[11px] text-white/40">{e.message}</p>}
            </div>
            <span className="shrink-0 font-mono text-[10px] text-white/30">{timeAgo(e.createdAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
