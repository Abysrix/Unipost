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
  const valueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    if (reduced) {
      setValue(target);
      valueRef.current = target;
      return;
    }

    // Animate from wherever the value currently sits, not always from 0 —
    // a permanent "only ever run once" latch here used to freeze every
    // caller's display at its first-rendered value forever (e.g. an
    // analytics counter never reflecting a later "Sync now"), since `active`
    // stays true indefinitely once a scroll-reveal has fired. Animating from
    // the current value instead of 0 also looks right for a real update,
    // not just a first reveal.
    const from = valueRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const next = from + (target - from) * eased;
      setValue(next);
      valueRef.current = next;
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setValue(target);
        valueRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration, reduced]);

  return value;
}
