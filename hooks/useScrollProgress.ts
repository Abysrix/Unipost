"use client";

import { useScroll, useSpring, type MotionValue } from "framer-motion";

/**
 * Smooth 0 → 1 progress of the whole page (or a target element).
 * Powers the ScrollProgress bar and any scroll-linked UI.
 */
export function useScrollProgress(
  target?: React.RefObject<HTMLElement>
): MotionValue<number> {
  const { scrollYProgress } = useScroll(
    target ? { target, offset: ["start start", "end end"] } : undefined
  );
  return useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
}
