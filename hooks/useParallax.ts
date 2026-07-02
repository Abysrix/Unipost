"use client";

import { useRef } from "react";
import { useScroll, useTransform, useSpring, type MotionValue } from "framer-motion";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface UseParallaxOptions {
  /** Total travel in px across the element's scroll range. */
  distance?: number;
  /** Axis to move on. */
  axis?: "x" | "y";
  /** Spring-smooth the output (buttery) vs raw scroll-linked. */
  smooth?: boolean;
}

/**
 * Transform-only scroll parallax. Returns a ref for the wrapper and a MotionValue
 * to bind to a layer's `style`. Disabled (returns 0) under reduced motion.
 *
 *   const { ref, value } = useParallax({ distance: 120 });
 *   <div ref={ref}><motion.div style={{ y: value }} /></div>
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>({
  distance = 100,
  axis = "y",
  smooth = true,
}: UseParallaxOptions = {}): { ref: React.RefObject<T>; value: MotionValue<number> } {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const raw = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [-distance / 2, distance / 2]
  );
  const smoothed = useSpring(raw, { stiffness: 100, damping: 30, restDelta: 0.01 });

  return { ref, value: smooth ? smoothed : raw };
}
