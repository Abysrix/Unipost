"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * AuroraBackdrop — the cheap, WebGL-free aurora ambiance (blurred drifting
 * blobs). Default background for most sections and the SceneCanvas fallback.
 * Transform/opacity only; frozen under reduced motion.
 */
export default function AuroraBackdrop({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const reduced = usePrefersReducedMotion();

  const blobs = [
    { c: "rgba(34,211,238,0.18)", x: "20%", y: "30%", s: 520, dx: [0, 40, 0], dy: [0, -30, 0], d: 28 },
    { c: "rgba(52,211,153,0.16)", x: "70%", y: "45%", s: 460, dx: [0, -34, 0], dy: [0, 28, 0], d: 34 },
    { c: "rgba(250,204,21,0.10)", x: "50%", y: "70%", s: 400, dx: [0, 28, 0], dy: [0, 22, 0], d: 31 },
  ];

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: b.x,
            top: b.y,
            width: b.s,
            height: b.s,
            translateX: "-50%",
            translateY: "-50%",
            background: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`,
            filter: "blur(60px)",
            opacity: intensity,
          }}
          animate={reduced ? {} : { x: b.dx, y: b.dy }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
