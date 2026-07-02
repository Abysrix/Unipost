"use client";

import { motion } from "framer-motion";
import { getPlatform } from "@/config/platforms";
import { connectedPlatforms } from "./data";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Connected-platform row — each badge pulses in a gentle staggered loop. */
export default function PlatformRow({ live }: { live: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Connected</span>
        <span className="flex items-center gap-1 text-[9px] text-aurora-green">
          <span className="h-1 w-1 rounded-full bg-aurora-green" /> All synced
        </span>
      </div>
      <div className="flex items-center gap-2">
        {connectedPlatforms.map((id, i) => {
          const p = getPlatform(id);
          if (!p) return null;
          return (
            <motion.span
              key={id}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
              style={{ background: `${p.color}1f`, border: `1px solid ${p.color}40`, color: p.color }}
              animate={reduced || !live ? {} : { boxShadow: [`0 0 0 ${p.color}00`, `0 0 12px ${p.color}55`, `0 0 0 ${p.color}00`] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
              aria-label={p.name}
            >
              {p.glyph}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
