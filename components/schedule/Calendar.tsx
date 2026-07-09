"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  monthMatrix, weekDays, HOURS, hourLabel, isToday, isSameDay, addDays,
  minutesOfDay, moveToDate, WEEKDAY_LABELS, dayTitle,
} from "@/lib/schedule/calendar";
import type { CalendarView, ScheduledEvent } from "@/types/schedule";
import CalendarEvent from "./CalendarEvent";

const HOUR_PX = 48;

interface Props {
  events: ScheduledEvent[];
  view: CalendarView;
  cursor: Date;
  onOpenEvent: (event: ScheduledEvent) => void;
  onReschedule: (id: string, instant: Date) => void;
  onResize: (id: string, durationMin: number) => void;
  onNewOn: (date: Date) => void;
  onSelectDay: (date: Date) => void;
}

/** Column-pack a day's events into lanes so overlaps sit side by side. */
function packDay(evs: ScheduledEvent[]) {
  const items = evs
    .map((e) => {
      const s = minutesOfDay(new Date(e.scheduled_time));
      return { e, s, en: s + Math.max(e.duration_min, 20) };
    })
    .sort((a, b) => a.s - b.s || a.en - b.en);

  const out: { e: ScheduledEvent; s: number; en: number; lane: number; cols: number }[] = [];
  let cluster: (typeof out)[number][] = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    for (const it of cluster) {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > it.s) lane++;
      laneEnds[lane] = it.en;
      it.lane = lane;
    }
    for (const it of cluster) it.cols = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    clusterEnd = -1;
  };
  for (const it of items) {
    const node = { ...it, lane: 0, cols: 1 };
    if (cluster.length && node.s >= clusterEnd) flush();
    cluster.push(node);
    clusterEnd = Math.max(clusterEnd, node.en);
  }
  flush();
  return out;
}

export default function Calendar({ events, view, cursor, onOpenEvent, onReschedule, onResize, onNewOn, onSelectDay }: Props) {
  const dragId = useRef<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const findEvent = (id: string) => events.find((e) => e.id === id);

  const startDrag = useCallback((id: string) => {
    dragId.current = id;
    setDragActive(true);
  }, []);

  const dropOnDate = useCallback(
    (date: Date) => {
      const id = dragId.current;
      dragId.current = null;
      setDragActive(false);
      if (!id) return;
      const ev = findEvent(id);
      if (ev) onReschedule(id, moveToDate(new Date(ev.scheduled_time), date));
    },
    [events, onReschedule], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dropOnSlot = useCallback(
    (day: Date, hour: number) => {
      const id = dragId.current;
      dragId.current = null;
      setDragActive(false);
      if (!id) return;
      const ev = findEvent(id);
      if (!ev) return;
      const base = new Date(ev.scheduled_time);
      const moved = new Date(day);
      moved.setHours(hour, base.getMinutes(), 0, 0);
      onReschedule(id, moved);
    },
    [events, onReschedule], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── Resize (week/day blocks) ── */
  const resize = useRef<{ id: string; startY: number; orig: number; duration: number } | null>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const [resizePreview, setResizePreview] = useState<{ id: string; duration: number } | null>(null);

  const onResizeMove = useCallback((e: PointerEvent) => {
    const r = resize.current;
    if (!r) return;
    const dyMin = ((e.clientY - r.startY) / HOUR_PX) * 60;
    const duration = Math.min(1440, Math.max(15, Math.round((r.orig + dyMin) / 15) * 15));
    r.duration = duration;
    setResizePreview({ id: r.id, duration });
  }, []);
  const onResizeEnd = useCallback(() => {
    const r = resize.current;
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeEnd);
    if (r) onResizeRef.current(r.id, r.duration);
    resize.current = null;
    setResizePreview(null);
  }, [onResizeMove]);
  const startResize = useCallback(
    (id: string, e: React.PointerEvent) => {
      const ev = findEvent(id);
      if (!ev) return;
      resize.current = { id, startY: e.clientY, orig: ev.duration_min, duration: ev.duration_min };
      setResizePreview({ id, duration: ev.duration_min });
      window.addEventListener("pointermove", onResizeMove);
      window.addEventListener("pointerup", onResizeEnd);
    },
    [events, onResizeMove, onResizeEnd], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const eventsOn = (day: Date) => events.filter((e) => isSameDay(new Date(e.scheduled_time), day));

  /* ────────── Month ────────── */
  if (view === "month") {
    const cells = monthMatrix(cursor);
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]", dragActive && "ring-1 ring-aurora-teal/20")}>
        <div className="grid grid-cols-7 border-b border-white/[0.06]">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-white/35">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const inMonth = day.getMonth() === cursor.getMonth();
            const dayEvents = eventsOn(day);
            return (
              <div
                key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOnDate(day)}
                onClick={() => onNewOn(day)}
                className={cn(
                  "min-h-[104px] cursor-pointer border-b border-r border-white/[0.04] p-1.5 transition-colors last:border-r-0 hover:bg-white/[0.015]",
                  !inMonth && "bg-black/20 opacity-50",
                  i % 7 === 6 && "border-r-0",
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px]", isToday(day) ? "bg-aurora-teal font-bold text-black" : "text-white/45")}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <CalendarEvent key={ev.id} event={ev} onOpen={onOpenEvent} onDragStartEvent={startDrag} />
                  ))}
                  {dayEvents.length > 3 && (
                    <button onClick={(e) => { e.stopPropagation(); onSelectDay(day); }} className="px-1 text-left text-[10px] text-white/40 hover:text-white/70">
                      +{dayEvents.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ────────── Week / Day (time grid) ────────── */
  if (view === "week" || view === "day") {
    const days = view === "week" ? weekDays(cursor) : [cursor];
    return (
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="flex border-b border-white/[0.06]" style={{ paddingLeft: 48 }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => onSelectDay(d)} className="flex-1 py-2 text-center">
              <div className="font-mono text-[10px] uppercase tracking-wider text-white/35">{WEEKDAY_LABELS[d.getDay()]}</div>
              <div className={cn("mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px]", isToday(d) ? "bg-aurora-teal font-bold text-black" : "text-white/70")}>{d.getDate()}</div>
            </button>
          ))}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <div className="relative flex" style={{ height: HOURS.length * HOUR_PX }}>
            {/* hour gutter */}
            <div className="w-12 shrink-0">
              {HOURS.map((h) => (
                <div key={h} className="relative border-b border-white/[0.03]" style={{ height: HOUR_PX }}>
                  <span className="absolute -top-1.5 right-1 font-mono text-[9px] text-white/30">{h === 0 ? "" : hourLabel(h)}</span>
                </div>
              ))}
            </div>
            {/* day columns */}
            {days.map((day, di) => {
              const packed = packDay(eventsOn(day));
              return (
                <div key={di} className={cn("relative flex-1 border-l border-white/[0.04]", isToday(day) && "bg-aurora-teal/[0.02]")}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOnSlot(day, h)}
                      onClick={() => { const d = new Date(day); d.setHours(h, 0, 0, 0); onNewOn(d); }}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                      style={{ height: HOUR_PX }}
                    />
                  ))}
                  {packed.map(({ e, s, lane, cols }) => {
                    const dur = resizePreview?.id === e.id ? resizePreview.duration : e.duration_min;
                    const top = (s / 60) * HOUR_PX;
                    const height = Math.max((Math.max(dur, 20) / 60) * HOUR_PX, 22);
                    const width = `calc(${100 / cols}% - 4px)`;
                    const left = `calc(${(lane / cols) * 100}% + 2px)`;
                    return (
                      <div key={e.id} className="absolute z-10" style={{ top, height, left, width }}>
                        <CalendarEvent event={e} variant="block" onOpen={onOpenEvent} onDragStartEvent={startDrag} onResizeStart={startResize} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ────────── Agenda ────────── */
  const upcoming = [...events].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  const groups = new Map<string, ScheduledEvent[]>();
  for (const e of upcoming) {
    const key = new Date(e.scheduled_time).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const entries = Array.from(groups.entries());

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      {entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">Nothing scheduled. Pick a day to add a post.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {entries.map(([key, evs]) => {
            const d = new Date(key);
            return (
              <div key={key}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px]", isToday(d) ? "bg-aurora-teal font-bold text-black" : "bg-white/[0.06] text-white/60")}>{d.getDate()}</span>
                  <h3 className="text-sm font-semibold text-white/80">{dayTitle(d)}</h3>
                </div>
                <div className="flex flex-col gap-1.5 border-l border-white/[0.06] pl-3">
                  {evs.map((ev) => (
                    <CalendarEvent key={ev.id} event={ev} onOpen={onOpenEvent} onDragStartEvent={startDrag} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Exposed for the studio's "prev/next" so it doesn't re-implement stepping. */
export function stepCursor(cursor: Date, view: CalendarView, dir: 1 | -1): Date {
  if (view === "month") {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + dir);
    return d;
  }
  if (view === "week") return addDays(cursor, 7 * dir);
  return addDays(cursor, dir);
}
