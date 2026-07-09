"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import PlatformBadge from "@/components/ui/PlatformBadge";
import type { ScheduledEvent } from "@/types/schedule";
import { reschedulePost } from "@/app/(app)/calendar/actions";
import { zonedWallTimeToUtcIso, zonedInputs, formatDateTime, relativeTo } from "@/lib/schedule/timezone";
import { validateScheduleTime } from "@/lib/schedule/scheduling";
import { toDateInputValue } from "@/lib/schedule/calendar";
import TimePicker from "./TimePicker";
import TimezoneSelector from "./TimezoneSelector";

export default function RescheduleModal({
  event,
  onClose,
  onRescheduled,
}: {
  event: ScheduledEvent;
  onClose: () => void;
  onRescheduled: (id: string, scheduledTime: string, timezone: string) => void;
}) {
  const init = zonedInputs(event.scheduled_time, event.timezone);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [tz, setTz] = useState(event.timezone);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  let preview: { label: string; rel: string } | null = null;
  try {
    const iso = zonedWallTimeToUtcIso(date, time, tz);
    preview = { label: formatDateTime(iso, tz), rel: relativeTo(iso) };
  } catch {
    preview = null;
  }

  async function save() {
    setError(null);
    const timeErr = validateScheduleTime(date, time, tz);
    if (timeErr) return setError(timeErr);
    setBusy(true);
    const iso = zonedWallTimeToUtcIso(date, time, tz);
    const res = await reschedulePost({ id: event.id, scheduledTime: iso, timezone: tz });
    setBusy(false);
    if (res.error) return setError(res.error);
    onRescheduled(event.id, iso, tz);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Reschedule">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
          <PlatformBadge platform={event.platform} size="sm" showLabel={false} />
          <span className="truncate text-sm font-medium text-white">{event.post?.title?.trim() || "Untitled post"}</span>
        </div>

        <TimePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} minDate={toDateInputValue(new Date())} />
        <TimezoneSelector value={tz} onChange={setTz} />

        {preview && (
          <div className="flex items-center gap-2 rounded-lg border border-aurora-teal/15 bg-aurora-teal/[0.05] px-3 py-2.5 text-[13px]">
            <CalendarClock size={15} className="shrink-0 text-aurora-teal" />
            <span className="text-white/80">{preview.label}</span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-aurora-teal">{preview.rel}</span>
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button onClick={onClose} type="button" className="rounded-full border border-white/[0.12] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">Cancel</button>
          <button onClick={save} disabled={busy} type="button" className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
