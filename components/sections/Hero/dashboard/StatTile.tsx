"use client";

import { useCountUp } from "@/hooks/useCountUp";

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** A single analytics tile — count-up value, delta, and a mini sparkline. */
export default function StatTile({
  label,
  value,
  delta,
  accent,
  live,
}: {
  label: string;
  value: number;
  delta: string;
  accent: string;
  live: boolean;
}) {
  const isPercent = value < 100;
  const current = useCountUp(value, { active: live, duration: 1600 });
  const display = isPercent ? `${current.toFixed(1)}%` : compact(current);

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-white/30">{label}</div>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-display text-lg font-bold tabular-nums text-white">{display}</div>
          <div className="text-[9px]" style={{ color: accent }}>{delta}</div>
        </div>
        <svg width="44" height="20" viewBox="0 0 44 20" fill="none" className="overflow-visible">
          <path d="M0,16 C7,14 12,13 20,8 C28,3 34,7 44,2" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="44" cy="2" r="1.6" fill={accent} />
        </svg>
      </div>
    </div>
  );
}
