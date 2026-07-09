"use client";

import { getPlatform } from "@/config/platforms";
import { cn } from "@/lib/utils";
import { timeLabel } from "@/lib/schedule/calendar";
import { statusMeta } from "@/lib/schedule/status";
import type { ScheduledEvent } from "@/types/schedule";
import { StatusDot } from "./PublishingStatus";

/** A single calendar event. `chip` = month/agenda, `block` = week/day time-grid. */
export default function CalendarEvent({
  event,
  variant = "chip",
  onOpen,
  onDragStartEvent,
  onResizeStart,
  style,
  className,
}: {
  event: ScheduledEvent;
  variant?: "chip" | "block";
  onOpen: (event: ScheduledEvent) => void;
  onDragStartEvent: (id: string) => void;
  onResizeStart?: (id: string, e: React.PointerEvent) => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const p = getPlatform(event.platform);
  const color = p?.color ?? "#2dd4bf";
  const when = timeLabel(new Date(event.scheduled_time));
  const title = event.post?.title?.trim() || "Untitled post";
  const dim = event.status === "canceled" || event.status === "published";
  // Published posts are already live — moving the DB record shouldn't imply the
  // platform post itself moved, so dragging is disabled once published.
  const movable = event.status !== "published";

  return (
    <button
      type="button"
      draggable={movable}
      onDragStart={(e) => {
        if (!movable) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", event.id);
        onDragStartEvent(event.id);
      }}
      onClick={() => onOpen(event)}
      title={`${title} · ${when}`}
      style={{ borderLeftColor: color, ...style }}
      className={cn(
        "group/ev relative flex w-full items-center gap-1.5 overflow-hidden border-l-2 text-left transition-opacity",
        variant === "chip" ? "rounded-r px-1.5 py-1" : "h-full flex-col items-start rounded-md p-1.5",
        dim ? "opacity-55" : "hover:opacity-90",
        movable ? "cursor-grab" : "cursor-pointer",
        className,
      )}
    >
      <span className="absolute inset-0 -z-10" style={{ background: `${color}1a` }} aria-hidden />
      <span className="flex w-full items-center gap-1.5">
        <span className="shrink-0 font-mono text-[9px] text-white/50">{when}</span>
        <StatusDot status={event.status} />
        <span
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[8px] font-bold"
          style={{ background: `${color}33`, color }}
          aria-hidden
        >
          {p?.glyph}
        </span>
      </span>
      <span className={cn("min-w-0 truncate text-[11px] font-medium text-white/85", variant === "chip" && "flex-1")}>{title}</span>

      {variant === "block" && onResizeStart && event.status !== "published" && event.status !== "canceled" && (
        <span
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(event.id, e);
          }}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover/ev:opacity-100"
          aria-hidden
        >
          <span className="mx-auto block h-0.5 w-6 rounded-full" style={{ background: statusMeta(event.status).hex }} />
        </span>
      )}
    </button>
  );
}
