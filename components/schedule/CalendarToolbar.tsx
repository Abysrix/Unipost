"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarView } from "@/types/schedule";

const VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];

export default function CalendarToolbar({
  view,
  onView,
  label,
  onPrev,
  onNext,
  onToday,
  onNew,
}: {
  view: CalendarView;
  onView: (v: CalendarView) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={onPrev} aria-label="Previous" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 transition-colors hover:border-white/20 hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNext} aria-label="Next" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 transition-colors hover:border-white/20 hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={onToday} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white">
          Today
        </button>
        <h2 className="font-display text-lg font-bold text-white">{label}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              aria-pressed={view === v}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors", view === v ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white/80")}
            >
              {v}
            </button>
          ))}
        </div>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
          <Plus size={14} /> Schedule
        </button>
      </div>
    </div>
  );
}
