import type { LucideIcon } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

/** One usage bar — "X of Y" with a fill, used for storage / accounts / scheduled posts. */
export default function UsageProgress({
  icon: Icon,
  label,
  current,
  limit,
  formatValue,
}: {
  icon: LucideIcon;
  label: string;
  current: number;
  /** Pass `Infinity` for an unlimited plan tier. */
  limit: number;
  formatValue?: (n: number) => string;
}) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((current / Math.max(limit, 1)) * 100));
  const near = !unlimited && pct >= 90;
  const fmt = formatValue ?? ((n: number) => formatNumber(n));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] text-white/60">
          <Icon size={13} className="text-white/40" /> {label}
        </span>
        <span className={cn("font-mono text-[11px]", near ? "text-amber-300" : "text-white/40")}>
          {fmt(current)} {unlimited ? "" : `/ ${fmt(limit)}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full", unlimited ? "bg-aurora-teal/50 w-full" : near ? "bg-amber-400" : "[background:linear-gradient(90deg,#22d3ee,#34d399)]")} style={unlimited ? undefined : { width: `${pct}%` }} />
      </div>
      {unlimited && <p className="mt-1 text-[10px] text-aurora-teal/70">Unlimited on your plan</p>}
    </div>
  );
}
