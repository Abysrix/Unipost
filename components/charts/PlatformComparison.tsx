"use client";

import { getPlatform, type PlatformId } from "@/config/platforms";
import { formatNumber } from "@/lib/utils";

export interface PlatformMetric {
  platform: PlatformId;
  value: number;
}

/** PlatformComparison — ranked bars comparing one metric across platforms. */
export default function PlatformComparison({ data, label }: { data: PlatformMetric[]; label: string }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  if (sorted.length === 0) return <div className="flex h-32 items-center justify-center text-sm text-white/30">No data yet.</div>;

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((d) => {
        const p = getPlatform(d.platform);
        const pct = (d.value / max) * 100;
        return (
          <div key={d.platform}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-white/70">
                <span className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold" style={{ background: `${p?.color}22`, color: p?.color }}>
                  {p?.glyph}
                </span>
                {p?.name ?? d.platform}
              </span>
              <span className="font-mono text-white/40">{formatNumber(d.value)} {label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p?.color ?? "#2dd4bf" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
