"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";
import type { Post } from "@/types/post";
import type { CalendarView, ScheduledEvent } from "@/types/schedule";
import { localTimezone } from "@/lib/schedule/timezone";
import { monthTitle, weekTitle, dayTitle, toDateInputValue } from "@/lib/schedule/calendar";
import { deriveReminders } from "@/lib/schedule/reminders";
import {
  reschedulePost, cancelScheduled, deleteScheduled, retryScheduled,
  setSchedulePriority, reorderScheduleQueue, duplicateScheduled, archiveScheduled, publishScheduledNow,
} from "@/app/(app)/calendar/actions";
import Modal from "@/components/ui/Modal";
import CalendarToolbar from "./CalendarToolbar";
import Calendar, { stepCursor } from "./Calendar";
import QueueManager from "./QueueManager";
import ScheduleModal from "./ScheduleModal";
import RescheduleModal from "./RescheduleModal";
import ScheduledPostCard, { type ScheduledCardHandlers } from "./ScheduledPostCard";
import RemindersPanel from "./RemindersPanel";
import UpcomingPostsWidget from "./UpcomingPostsWidget";

type Tab = "calendar" | "queue";

export default function SchedulerStudio({ initialEvents, drafts }: { initialEvents: ScheduledEvent[]; drafts: Post[] }) {
  const mounted = useMounted();
  const [events, setEvents] = useState<ScheduledEvent[]>(initialEvents);
  const [tab, setTab] = useState<Tab>("calendar");
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const detailEvent = detailId ? events.find((e) => e.id === detailId) ?? null : null;
  const rescheduleEvent = rescheduleId ? events.find((e) => e.id === rescheduleId) ?? null : null;
  const reminders = useMemo(() => (mounted ? deriveReminders(events, drafts.length) : []), [events, drafts.length, mounted]);
  const activeCount = events.filter((e) => ["scheduled", "queued", "failed", "publishing"].includes(e.status)).length;

  /* ── mutations (optimistic) ── */
  const patch = (id: string, p: Partial<ScheduledEvent>) => setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));

  function rescheduleInstant(id: string, instant: Date) {
    const iso = instant.toISOString();
    const tz = localTimezone();
    patch(id, { scheduled_time: iso, timezone: tz, status: "scheduled", error: null });
    void reschedulePost({ id, scheduledTime: iso, timezone: tz });
  }
  function resize(id: string, durationMin: number) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    patch(id, { duration_min: durationMin, status: "scheduled", error: null });
    void reschedulePost({ id, scheduledTime: ev.scheduled_time, timezone: ev.timezone, durationMin });
  }
  async function publishNow(id: string) {
    setBusyId(id);
    patch(id, { status: "publishing" });
    const res = await publishScheduledNow(id);
    setBusyId(null);
    if (res.ok) patch(id, { status: "published", published_at: new Date().toISOString(), error: null });
    else patch(id, { status: "failed", error: res.error ?? "Publishing failed", retry_count: (events.find((e) => e.id === id)?.retry_count ?? 0) + 1 });
  }
  function retry(id: string) {
    patch(id, { status: "queued", error: null });
    void retryScheduled(id);
  }
  function cancel(id: string) {
    patch(id, { status: "canceled" });
    void cancelScheduled(id);
  }
  function del(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    void deleteScheduled(id);
  }
  function archive(id: string) {
    patch(id, { status: "canceled" });
    void archiveScheduled(id);
  }
  function togglePriority(id: string, priority: boolean) {
    patch(id, { priority });
    void setSchedulePriority(id, priority);
  }
  function reorder(ids: string[]) {
    setEvents((prev) => prev.map((e) => (ids.indexOf(e.id) === -1 ? e : { ...e, position: ids.indexOf(e.id) })));
    void reorderScheduleQueue(ids);
  }
  async function duplicate(id: string) {
    setBusyId(id);
    const res = await duplicateScheduled(id);
    setBusyId(null);
    const src = events.find((e) => e.id === id);
    if (res.id && src) {
      const nextTime = new Date(new Date(src.scheduled_time).getTime() + 86_400_000).toISOString();
      setEvents((prev) => [...prev, { ...src, id: res.id as string, scheduled_time: nextTime, status: "scheduled", published_at: null, error: null }]);
    }
  }

  const cardHandlers: ScheduledCardHandlers = {
    onReschedule: (e) => { setDetailId(null); setRescheduleId(e.id); },
    onPublishNow: publishNow,
    onDuplicate: duplicate,
    onCancel: cancel,
    onDelete: (id) => { setDetailId(null); del(id); },
    onRetry: retry,
    onArchive: archive,
    onTogglePriority: togglePriority,
  };

  function openSchedule(date?: Date) {
    setScheduleDate(date ? toDateInputValue(date) : undefined);
    setScheduleOpen(true);
  }

  const label = view === "month" ? monthTitle(cursor) : view === "week" ? weekTitle(cursor) : view === "day" ? dayTitle(cursor) : "Agenda";

  if (!mounted) {
    return <div className="h-[60vh] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" aria-hidden />;
  }

  return (
    <div>
      {/* Tabs */}
      <div role="tablist" className="mb-5 flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        {([["calendar", "Calendar", CalendarDays], ["queue", "Queue", ListOrdered]] as const).map(([id, lbl, Icon]) => (
          <button
            key={id}
            role="tab"
            onClick={() => setTab(id)}
            aria-selected={tab === id}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors", tab === id ? "bg-white/[0.07] text-white" : "text-white/50 hover:text-white/80")}
          >
            <Icon size={15} /> {lbl}
            {id === "queue" && activeCount > 0 && <span className="rounded-full bg-aurora-teal/15 px-1.5 text-[10px] text-aurora-teal">{activeCount}</span>}
          </button>
        ))}
      </div>

      {tab === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <CalendarToolbar
              view={view}
              onView={setView}
              label={label}
              onPrev={() => setCursor((c) => stepCursor(c, view, -1))}
              onNext={() => setCursor((c) => stepCursor(c, view, 1))}
              onToday={() => setCursor(new Date())}
              onNew={() => openSchedule()}
            />
            <Calendar
              events={events}
              view={view}
              cursor={cursor}
              onOpenEvent={(e) => setDetailId(e.id)}
              onReschedule={rescheduleInstant}
              onResize={resize}
              onNewOn={(d) => openSchedule(d)}
              onSelectDay={(d) => { setCursor(d); setView("day"); }}
            />
          </div>
          <aside className="space-y-5">
            <RemindersPanel reminders={reminders} />
            <UpcomingPostsWidget events={events} />
          </aside>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <QueueManager events={events} handlers={cardHandlers} onReorder={reorder} busyId={busyId} />
          </div>
          <aside className="space-y-5">
            <RemindersPanel reminders={reminders} />
            <UpcomingPostsWidget events={events} />
          </aside>
        </div>
      )}

      {/* Schedule new */}
      {scheduleOpen && (
        <ScheduleModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          drafts={drafts}
          defaultDate={scheduleDate}
          onScheduled={(newEvents) => setEvents((prev) => [...prev, ...newEvents])}
        />
      )}

      {/* Reschedule */}
      {rescheduleEvent && (
        <RescheduleModal
          event={rescheduleEvent}
          onClose={() => setRescheduleId(null)}
          onRescheduled={(id, iso, tz) => patch(id, { scheduled_time: iso, timezone: tz, status: "scheduled", error: null })}
        />
      )}

      {/* Event detail */}
      <Modal open={!!detailEvent} onClose={() => setDetailId(null)} title="Scheduled post">
        {detailEvent && <ScheduledPostCard event={detailEvent} busy={busyId === detailEvent.id} {...cardHandlers} />}
      </Modal>
    </div>
  );
}
