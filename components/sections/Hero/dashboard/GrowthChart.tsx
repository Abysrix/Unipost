"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { growthSeries } from "./data";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const W = 320;
const H = 90;

/** Animated area chart — the line draws on and the fill fades when `live`. */
export default function GrowthChart({ live }: { live: boolean }) {
  const reduced = usePrefersReducedMotion();

  const { line, area } = useMemo(() => {
    const max = Math.max(...growthSeries);
    const pts = growthSeries.map((v, i) => {
      const x = (i / (growthSeries.length - 1)) * W;
      const y = H - (v / max) * (H - 12) - 6;
      return [x, y] as const;
    });
    // smooth-ish path
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
    }
    return { line: d, area: `${d} L${W},${H} L0,${H} Z` };
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Audience Growth</span>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] text-white/30">30d</span>
          <span className="text-[10px] text-aurora-green">+18.2%</span>
        </div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="growthLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#growthFill)"
          initial={{ opacity: 0 }}
          animate={live ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="url(#growthLine)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={live ? { pathLength: 1 } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </div>
  );
}
