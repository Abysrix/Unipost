"use client";

import { GripVertical, Zap, CalendarClock, RefreshCw, Trash2, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/config/platforms";
import { formatDateTime, relativeTo } from "@/lib/schedule/timezone";
import type { ScheduledEvent } from "@/types/schedule";
import PublishingStatus from "./PublishingStatus";
import type { ScheduledCardHandlers } from "./ScheduledPostCard";

/** A single draggable queue row. Reorder handled by the parent QueueManager. */
export default function QueueCard({
  event,
  order,
  dragging = false,
  draggable = true,
  busy = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  handlers,
}: {
  event: ScheduledEvent;
  order: number;
  dragging?: boolean;
  draggable?: boolean;
  busy?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  handlers: ScheduledCardHandlers;
}) {
  const p = getPlatform(event.platform);
  const title = event.post?.title?.trim() || "Untitled post";
  const iconBtn = "flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] text-white/50 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 transition-all",
        dragging ? "opacity-40" : "hover:border-white/[0.14]",
        event.priority && "ring-1 ring-aurora-yellow/25",
      )}
    >
      {draggable && <GripVertical size={15} className="shrink-0 cursor-grab text-white/25" />}
      <span className="w-5 shrink-0 text-center font-mono text-[11px] text-white/30">{order}</span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }}>{p?.glyph}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-white/85">{title}</span>
          {event.priority && <Star size={11} className="shrink-0 fill-aurora-yellow text-aurora-yellow" />}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <CalendarClock size={11} /> {formatDateTime(event.scheduled_time, event.timezone)}
          <span className="text-aurora-teal">· {relativeTo(event.scheduled_time)}</span>
        </div>
      </div>

      <PublishingStatus status={event.status} size="sm" />

      <div className="flex shrink-0 items-center gap-1">
        {handlers.onTogglePriority && (
          <button onClick={() => handlers.onTogglePriority?.(event.id, !event.priority)} aria-label="Priority" disabled={busy} className={iconBtn} title="Priority">
            <Star size={13} className={event.priority ? "fill-aurora-yellow text-aurora-yellow" : ""} />
          </button>
        )}
        {event.status === "failed" && handlers.onRetry ? (
          <button onClick={() => handlers.onRetry?.(event.id)} aria-label="Retry" disabled={busy} className={iconBtn} title="Retry">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        ) : (
          handlers.onPublishNow && (
            <button onClick={() => handlers.onPublishNow?.(event.id)} aria-label="Publish now" disabled={busy} className={iconBtn} title="Publish now">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            </button>
          )
        )}
        {handlers.onDelete && (
          <button onClick={() => handlers.onDelete?.(event.id)} aria-label="Remove" disabled={busy} className={cn(iconBtn, "hover:border-red-500/40 hover:text-red-400")} title="Remove">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
