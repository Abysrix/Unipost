"use client";

import { useRef } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";
import { spring } from "@/lib/tokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface UseMagneticOptions {
  /** How strongly the element follows the cursor (0–1). */
  strength?: number;
  /** Vertical amplification (buttons pull up more than sideways). */
  yBias?: number;
}

/**
 * Magnetic hover — element drifts toward the cursor, springs back on leave.
 * Shared by buttons, nav, and cards.
 *
 *   const { ref, x, y, bind } = useMagnetic();
 *   <motion.a ref={ref} style={{ x, y }} {...bind}>…</motion.a>
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>({
  strength = 0.3,
  yBias = 1.3,
}: UseMagneticOptions = {}): {
  ref: React.RefObject<T>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  bind: { onMouseMove: (e: React.MouseEvent) => void; onMouseLeave: () => void };
} {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, spring.magnetic);
  const y = useSpring(rawY, spring.magnetic);

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - rect.left - rect.width / 2) * strength);
    rawY.set((e.clientY - rect.top - rect.height / 2) * strength * yBias);
  };
  const onMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return { ref, x, y, bind: { onMouseMove, onMouseLeave } };
}
