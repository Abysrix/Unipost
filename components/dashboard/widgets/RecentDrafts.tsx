import { FileText, PenSquare } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import EmptyState from "../EmptyState";
import { getPlatform } from "@/config/platforms";
import { recentDrafts } from "@/lib/mock/dashboard";

/** Recent drafts list — resume writing where you left off. */
export default function RecentDrafts() {
  return (
    <WidgetContainer title="Recent Drafts" icon={FileText} action={{ label: "All posts", href: "/posts" }}>
      {recentDrafts.length === 0 ? (
        <EmptyState compact icon={PenSquare} title="No drafts yet" description="Start writing — save it and finish later." primary={{ label: "New draft", href: "/create" }} />
      ) : (
        <ul className="flex flex-col gap-2">
          {recentDrafts.map((d, i) => {
            const p = getPlatform(d.platform);
            return (
              <li key={i} className="group flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:border-white/[0.1]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }}>{p?.glyph}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-white/70">{d.title}</div>
                  <div className="text-[11px] text-white/50">Edited {d.edited}</div>
                </div>
                <PenSquare size={14} className="shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
