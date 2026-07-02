"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * True when the user requests reduced motion. Every animation surface (Framer,
 * GSAP, R3F) must consult this and degrade to static — the site stays beautiful
 * and legible without movement.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
