"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

/**
 * AnalyticsCard — the KPI tile for the Creator Intelligence dashboard. Extends
 * StatCard's visual language with loading/empty states, a prior-period
 * comparison delta, and an animated count-up value.
 */
export default function AnalyticsCard({
  icon: Icon,
  label,
  value,
  previousValue,
  suffix = "",
  decimals = 0,
  accent = "#2dd4bf",
  loading = false,
  empty = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  /** Same metric, prior period — renders the delta automatically. */
  previousValue?: number;
  suffix?: string;
  decimals?: number;
  accent?: string;
  loading?: boolean;
  empty?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5", className)}>
        <div className="mb-4 h-8 w-8 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-7 w-20 animate-pulse rounded bg-white/[0.05]" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
      </div>
    );
  }

  const delta = previousValue != null && previousValue > 0 ? (value - previousValue) / previousValue : null;
  const deltaUp = (delta ?? 0) >= 0;

  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors duration-300 hover:border-white/[0.14]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={15} style={{ color: accent }} strokeWidth={1.75} />
        </span>
        {delta != null && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", delta === 0 ? "text-white/35" : deltaUp ? "text-aurora-green" : "text-red-400")}>
            {delta === 0 ? <Minus size={12} /> : deltaUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
      </div>
      {empty ? (
        <div className="font-display text-2xl font-bold text-white/25">—</div>
      ) : (
        <div className="font-display text-2xl font-bold text-white">
          <AnimatedCounter value={value} suffix={suffix} decimals={decimals} duration={1200} />
        </div>
      )}
      <div className="mt-0.5 text-[13px] text-white/40">{label}</div>
      {previousValue != null && !empty && (
        <div className="mt-1 text-[11px] text-white/25">vs. {formatNumber(Math.round(previousValue))} prior period</div>
      )}
    </div>
  );
}
