"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * GlassCard — the canonical card (ported from Bharvix).
 * Faint fill, hairline border, 20px blur. On hover: border brightens, a
 * mouse-tracked radial glow appears, a spring 3D tilt (≤8°), and a top light-line.
 */
export default function GlassCard({
  children,
  accent = "#2dd4bf",
  tilt = true,
  glow = true,
  padding = "p-7",
  className,
  cursorLabel,
}: {
  children: React.ReactNode;
  accent?: string;
  tilt?: boolean;
  glow?: boolean;
  /** Inner padding utility; set "p-0" when the child manages its own padding. */
  padding?: string;
  className?: string;
  cursorLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rx: 0, ry: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tilt) {
      setTransform({ rx: ((y - rect.height / 2) / (rect.height / 2)) * -8, ry: ((x - rect.width / 2) / (rect.width / 2)) * 8 });
    }
    if (glow) setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };
  const onMouseLeave = () => setTransform({ rx: 0, ry: 0 });

  return (
    <div style={{ perspective: "1000px" }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        animate={{ rotateX: transform.rx, rotateY: transform.ry }}
        transition={{ type: "spring", stiffness: 150, damping: 18, mass: 0.6 }}
        data-cursor-label={cursorLabel}
        className={cn(
          "group relative h-full overflow-hidden rounded-2xl",
          padding,
          "border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl",
          "transition-colors duration-500 hover:border-white/[0.16]"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {glow && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${accent}18, transparent 60%)` }}
          />
        )}
        <div
          className="absolute left-8 right-8 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `linear-gradient(to right, transparent, ${accent}70, transparent)` }}
        />
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
}
