"use client";

import { useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface UseTiltOptions {
  /** Max rotation in degrees. Design system caps card tilt at 8°. */
  max?: number;
  /** Track a radial glow position (percentage) alongside the tilt. */
  trackGlow?: boolean;
}

/**
 * 3D tilt + optional mouse-tracked glow for cards. Apply the returned rotate to
 * an inner element (via style transform) and bind to the wrapper so any surface
 * can "acknowledge the cursor."
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({
  max = 8,
  trackGlow = true,
}: UseTiltOptions = {}) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setRotate({
      x: ((py - rect.height / 2) / (rect.height / 2)) * -max,
      y: ((px - rect.width / 2) / (rect.width / 2)) * max,
    });
    if (trackGlow) setGlow({ x: (px / rect.width) * 100, y: (py / rect.height) * 100 });
  };
  const onMouseLeave = () => setRotate({ x: 0, y: 0 });

  return { ref, rotate, glow, bind: { onMouseMove, onMouseLeave } };
}
