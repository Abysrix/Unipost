"use client";

import { CHART_PALETTE } from "@/lib/charts/svg";
import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/** BarChart — simple vertical bars. Backs Bar and Publishing Timeline views. */
export default function BarChart({ data, height = 140, formatValue }: { data: BarDatum[]; height?: number; formatValue?: (n: number) => string }) {
  if (data.length === 0) return <div className="flex h-32 items-center justify-center text-sm text-white/30">No data yet.</div>;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * (height - 20), d.value > 0 ? 3 : 0);
        return (
          <div key={`${d.label}-${i}`} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height }}>
            <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
            <div
              className={cn("w-full rounded-t transition-opacity group-hover:opacity-80")}
              style={{ height: h, background: d.color ?? CHART_PALETTE[0], minHeight: d.value > 0 ? 3 : 0 }}
            />
            <span className="mt-1.5 truncate text-[9px] text-white/30">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
