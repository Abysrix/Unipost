"use client";

import { CalendarClock, Copy, Trash2, Ban, Zap, Star, RefreshCw, Archive, Loader2, PenSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { formatDateTime, relativeTo, zoneAbbr } from "@/lib/schedule/timezone";
import type { ScheduledEvent } from "@/types/schedule";
import PublishingStatus from "./PublishingStatus";

export interface ScheduledCardHandlers {
  onReschedule?: (event: ScheduledEvent) => void;
  onPublishNow?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  onArchive?: (id: string) => void;
  onTogglePriority?: (id: string, priority: boolean) => void;
}

export default function ScheduledPostCard({
  event,
  busy = false,
  compact = false,
  ...h
}: { event: ScheduledEvent; busy?: boolean; compact?: boolean } & ScheduledCardHandlers) {
  const title = event.post?.title?.trim() || "Untitled post";
  const active = ["scheduled", "queued", "failed"].includes(event.status);
  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/50 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <PlatformBadge platform={event.platform} size="sm" showLabel={false} />
            <PublishingStatus status={event.status} />
            {event.priority && <Star size={12} className="fill-aurora-yellow text-aurora-yellow" />}
          </div>
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          {event.post?.content?.trim() && !compact && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/40">{event.post.content}</p>
          )}
        </div>
        {h.onTogglePriority && (
          <button onClick={() => h.onTogglePriority?.(event.id, !event.priority)} aria-label="Toggle priority" disabled={busy} className="shrink-0">
            <Star size={16} className={cn("transition-colors", event.priority ? "fill-aurora-yellow text-aurora-yellow" : "text-white/25 hover:text-white/50")} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-white/55">
        <CalendarClock size={13} className="shrink-0 text-white/35" />
        <span>{formatDateTime(event.scheduled_time, event.timezone)}</span>
        <span className="text-white/25">· {zoneAbbr(event.scheduled_time, event.timezone)}</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-aurora-teal">{relativeTo(event.scheduled_time)}</span>
      </div>

      {event.status === "failed" && event.error && (
        <p className="mt-2 rounded-lg bg-red-500/[0.06] px-2.5 py-1.5 text-[11px] text-red-400">
          {event.error}{event.retry_count > 0 ? ` · ${event.retry_count} attempt${event.retry_count === 1 ? "" : "s"}` : ""}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.05] pt-3">
        {event.status === "failed" && h.onRetry && (
          <button onClick={() => h.onRetry?.(event.id)} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-aurora-cyan/25 bg-aurora-cyan/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-aurora-cyan transition-colors hover:bg-aurora-cyan/[0.14] disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Retry
          </button>
        )}
        {active && h.onPublishNow && (
          <button onClick={() => h.onPublishNow?.(event.id)} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-aurora-green/25 bg-aurora-green/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-aurora-green transition-colors hover:bg-aurora-green/[0.14] disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Publish now
          </button>
        )}
        <Link href={`/create?id=${event.post_id}`} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
          <PenSquare size={12} /> Edit
        </Link>
        {active && h.onReschedule && (
          <button onClick={() => h.onReschedule?.(event)} disabled={busy} aria-label="Reschedule" className={iconBtn} title="Reschedule">
            <CalendarClock size={14} />
          </button>
        )}
        {h.onDuplicate && (
          <button onClick={() => h.onDuplicate?.(event.id)} disabled={busy} aria-label="Duplicate" className={iconBtn} title="Duplicate">
            <Copy size={14} />
          </button>
        )}
        {active && h.onCancel && (
          <button onClick={() => h.onCancel?.(event.id)} disabled={busy} aria-label="Cancel" className={iconBtn} title="Cancel">
            <Ban size={14} />
          </button>
        )}
        {h.onArchive && (
          <button onClick={() => h.onArchive?.(event.id)} disabled={busy} aria-label="Archive" className={iconBtn} title="Archive">
            <Archive size={14} />
          </button>
        )}
        {h.onDelete && (
          <button onClick={() => h.onDelete?.(event.id)} disabled={busy} aria-label="Delete" className={cn(iconBtn, "hover:border-red-500/40 hover:text-red-400")} title="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
