import { Zap } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

/** AI credit balance meter — used on the billing page and the dashboard widget. */
export default function CreditMeter({ remaining, total, compact = false }: { remaining: number; total: number; compact?: boolean }) {
  const used = Math.max(0, total - remaining);
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const low = total > 0 && remaining / total <= 0.1;

  return (
    <div>
      <div className={cn("mb-1.5 flex items-center justify-between", compact ? "text-[11px]" : "text-[12px]")}>
        <span className="flex items-center gap-1.5 text-white/50">
          <Zap size={compact ? 11 : 13} className={low ? "text-red-400" : "text-aurora-teal"} /> AI credits
        </span>
        <span className={cn("tabular-nums", low ? "text-red-400" : "text-white/60")}>
          {formatNumber(remaining)} / {formatNumber(total)}
        </span>
      </div>
      <div className={cn("w-full overflow-hidden rounded-full bg-white/[0.08]", compact ? "h-1.5" : "h-2")}>
        <div className={cn("h-full rounded-full transition-[width] duration-700", low ? "bg-red-400" : "[background:linear-gradient(90deg,#22d3ee,#34d399)]")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
