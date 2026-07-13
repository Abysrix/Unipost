import Link from "next/link";
import { FileText, PenSquare } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import EmptyState from "../EmptyState";
import { getPlatform } from "@/config/platforms";
import { timeAgo } from "@/lib/utils";
import type { Post } from "@/types/post";

/** Recent drafts list — resume writing where you left off. */
export default function RecentDrafts({ drafts }: { drafts: Post[] }) {
  return (
    <WidgetContainer title="Recent Drafts" icon={FileText} action={{ label: "All posts", href: "/posts" }}>
      {drafts.length === 0 ? (
        <EmptyState compact icon={PenSquare} title="No drafts yet" description="Start writing — save it and finish later." primary={{ label: "New draft", href: "/create" }} />
      ) : (
        <ul className="flex flex-col gap-2">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link
                href={`/create?id=${d.id}`}
                className="group flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:border-white/[0.1]"
              >
                <span className="flex shrink-0 -space-x-1.5">
                  {(d.platforms.length > 0 ? d.platforms : ["instagram" as const]).slice(0, 2).map((platformId) => {
                    const p = getPlatform(platformId);
                    return (
                      <span
                        key={platformId}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-bg-secondary text-[11px] font-bold"
                        style={{ background: `${p?.color}22`, color: p?.color }}
                      >
                        {p?.glyph}
                      </span>
                    );
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-white/70">{d.title?.trim() || "Untitled draft"}</div>
                  <div className="text-[11px] text-white/50">Edited {timeAgo(d.updated_at)}</div>
                </div>
                <PenSquare size={14} className="shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetContainer>
  );
}
