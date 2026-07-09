import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** KPI tile for the admin overview — same visual language as the dashboard's StatCard. */
export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaUp = true,
  accent = "#2dd4bf",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-white/[0.14]">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={14} style={{ color: accent }} strokeWidth={1.75} />
        </span>
        {delta && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-medium", deltaUp ? "text-aurora-green" : "text-red-400")}>
            {deltaUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta}
          </span>
        )}
      </div>
      <div className="font-display text-xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[12px] text-white/40">{label}</div>
      {hint && <div className="mt-1 text-[10px] text-white/25">{hint}</div>}
    </div>
  );
}
