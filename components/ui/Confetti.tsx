"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const COLORS = ["#22d3ee", "#34d399", "#facc15", "#a3e635", "#2dd4bf"];

/**
 * Confetti — a lightweight DOM burst (transform/opacity only). Fires when `fire`
 * is true. Purely decorative; skipped entirely under reduced motion.
 */
export default function Confetti({ fire, count = 24 }: { fire: boolean; count?: number }) {
  const reduced = usePrefersReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length],
        angle: (Math.PI * 2 * i) / count + Math.random() * 0.3,
        dist: 60 + Math.random() * 90,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.1,
        size: 4 + Math.random() * 4,
      })),
    [count]
  );

  if (reduced || !fire) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-[1px]"
          style={{ width: p.size, height: p.size * 1.6, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist + 40,
            opacity: 0,
            rotate: p.rotate,
            scale: 0.6,
          }}
          transition={{ duration: 1.1, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
