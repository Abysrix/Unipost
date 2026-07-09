"use client";

import { Calendar, Clock } from "lucide-react";

/** Date + time picker (native inputs, styled). Emits local wall-clock values. */
export default function TimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  minDate,
}: {
  date: string;
  time: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  minDate?: string;
}) {
  const field = "flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 focus-within:border-aurora-teal/40";
  const input = "w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]";
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className={field}>
        <Calendar size={15} className="shrink-0 text-white/40" />
        <input type="date" value={date} min={minDate} onChange={(e) => onDateChange(e.target.value)} aria-label="Date" className={input} />
      </label>
      <label className={field}>
        <Clock size={15} className="shrink-0 text-white/40" />
        <input type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} aria-label="Time" className={input} />
      </label>
    </div>
  );
}
