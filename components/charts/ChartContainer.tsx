"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimeRangeOption {
  label: string;
  days: number;
}

export const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

/**
 * ChartContainer — the shared frame every chart renders inside: title, optional
 * time-range filter, loading/empty states. One design system for the whole
 * chart system (Phase 3).
 */
export default function ChartContainer({
  title,
  icon: Icon = BarChart3,
  ranges,
  activeDays,
  onRangeChange,
  loading = false,
  empty = false,
  emptyMessage = "Not enough data yet.",
  action,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  ranges?: TimeRangeOption[];
  activeDays?: number;
  onRangeChange?: (days: number) => void;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-white/40" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {action}
          {ranges && (
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
              {ranges.map((r) => (
                <button
                  key={r.days}
                  onClick={() => onRangeChange?.(r.days)}
                  aria-pressed={activeDays === r.days}
                  className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", activeDays === r.days ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-32 w-full animate-pulse rounded-lg bg-white/[0.03]" />
        </div>
      ) : empty ? (
        <div className="flex h-40 items-center justify-center text-center text-sm text-white/35">{emptyMessage}</div>
      ) : (
        children
      )}
    </section>
  );
}
