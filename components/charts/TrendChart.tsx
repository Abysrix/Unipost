"use client";

import { useId } from "react";
import { seriesToPoints, smoothLine, areaFromLine, CHART_PALETTE } from "@/lib/charts/svg";

export interface TrendSeries {
  label: string;
  values: number[];
  color?: string;
}

/**
 * TrendChart — line or area chart, single or multi-series. Backs Line, Area,
 * Growth Curve and Platform Comparison overlays with one implementation.
 */
export default function TrendChart({
  series,
  labels,
  variant = "area",
  height = 160,
  formatValue,
}: {
  series: TrendSeries[];
  /** X-axis labels (e.g. dates), same length as each series' values. */
  labels?: string[];
  variant?: "line" | "area";
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const W = 600;
  const H = height;
  const uid = useId();
  const allValues = series.flatMap((s) => s.values);

  if (allValues.length === 0 || series.every((s) => s.values.length === 0)) {
    return <div className="flex h-40 items-center justify-center text-sm text-white/30">No data yet.</div>;
  }

  // Multi-series shares one scale so magnitude is comparable across platforms;
  // a single series keeps its own min/max for maximum visual variation.
  const sharedDomain: [number, number] | undefined = series.length > 1 ? [Math.min(...allValues, 0), Math.max(...allValues, 1)] : undefined;
  const lastValue = series[0]?.values.at(-1) ?? 0;

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
            return (
              <linearGradient key={s.label} id={`${uid}-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            );
          })}
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {series.map((s, i) => {
          const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
          const points = seriesToPoints(s.values, W, H, 8, sharedDomain);
          const line = smoothLine(points);
          return (
            <g key={s.label}>
              {variant === "area" && <path d={areaFromLine(line, points, W, H - 2)} fill={`url(#${uid}-fill-${i})`} />}
              <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s, i) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color ?? CHART_PALETTE[i % CHART_PALETTE.length] }} />
              {s.label}
            </span>
          ))}
        </div>
        {series.length === 1 && (
          <span className="font-mono text-[11px] text-white/40">{formatValue ? formatValue(lastValue) : lastValue}</span>
        )}
        {labels && labels.length > 0 && (
          <span className="hidden font-mono text-[10px] text-white/25 sm:inline">
            {labels[0]} – {labels.at(-1)}
          </span>
        )}
      </div>
    </div>
  );
}
