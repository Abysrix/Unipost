import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatCard — a KPI tile (icon, value, label, optional delta).
 * The reusable metric surface for dashboards and analytics.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaUp = true,
  accent = "#2dd4bf",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors duration-300 hover:border-white/[0.14]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={15} style={{ color: accent }} strokeWidth={1.75} />
        </span>
        {delta && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", deltaUp ? "text-aurora-green" : "text-red-400")}>
            {deltaUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {delta}
          </span>
        )}
      </div>
      <div className="font-display text-2xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[13px] text-white/40">{label}</div>
    </div>
  );
}

/** MetricCard — a compact inline metric (no icon), for dense rows. */
export function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/30">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-white/35">{hint}</div>}
    </div>
  );
}
