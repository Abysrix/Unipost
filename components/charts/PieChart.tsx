"use client";

import { arcPath, CHART_PALETTE } from "@/lib/charts/svg";

export interface PieDatum {
  label: string;
  value: number;
  color?: string;
}

/** PieChart — donut chart with a legend. Used for platform share breakdowns. */
export default function PieChart({ data, size = 140 }: { data: PieDatum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <div className="flex h-32 items-center justify-center text-sm text-white/30">No data yet.</div>;

  const r = size / 2;
  const inner = r * 0.6;
  let angle = 0;
  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    return { ...d, path: arcPath(r, r, r, inner, start, end), color: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length], pct: frac };
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Share breakdown">
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill={s.color} />
        ))}
      </svg>
      <ul className="flex flex-col gap-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[12px] text-white/70">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 truncate">{s.label}</span>
            <span className="ml-auto shrink-0 font-mono text-white/40">{Math.round(s.pct * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
