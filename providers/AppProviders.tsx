"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useLenis } from "@/hooks/useLenis";
import { ease } from "@/lib/tokens";
import CustomCursor from "@/components/cursor/CustomCursor";
import ScrollProgress from "@/components/layout/ScrollProgress";
import OfflineBanner from "@/components/layout/OfflineBanner";

/**
 * AppProviders — the single client boundary that wires global systems.
 * Mounted once in the root layout, wrapping all routes.
 *
 *   1. Lenis smooth scroll (drives the GSAP ticker → one master clock)
 *   2. GSAP plugin registration (idempotent)
 *   3. Custom cursor + scroll progress (global chrome)
 *   4. Motion defaults
 *
 * Reduced motion is honored explicitly per-component (usePrefersReducedMotion)
 * rather than via MotionConfig="user" — that strips transforms from `animate`
 * while leaving `initial`, which traps curtain/mask reveals off-screen.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  useLenis();

  useEffect(() => {
    // Dynamic import (same pattern as useLenis's own gsap load below) keeps
    // gsap + ScrollTrigger out of the shared bundle every route pays for —
    // only the landing page's own section components need it eagerly, and
    // Next's route-based splitting already handles that correctly on its own.
    import("@/lib/gsap").then(({ registerGsap }) => registerGsap());
  }, []);

  return (
    <MotionConfig reducedMotion="never" transition={{ ease: [...ease.expo] }}>
      <CustomCursor />
      <ScrollProgress />
      <OfflineBanner />
      {children}
    </MotionConfig>
  );
}
