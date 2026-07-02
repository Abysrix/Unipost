"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface UseCountUpOptions {
  duration?: number;
  active?: boolean;
}

/**
 * Animate a number 0 → target once `active` becomes true (easeOutExpo).
 * Reduced motion jumps straight to target. Powers analytics counters + Creator Score.
 */
export function useCountUp(
  target: number,
  { duration = 1800, active = true }: UseCountUpOptions = {}
): number {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();
  const started = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    if (reduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(target * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration, reduced]);

  return value;
}
