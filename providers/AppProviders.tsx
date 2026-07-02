"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useLenis } from "@/hooks/useLenis";
import { registerGsap } from "@/lib/gsap";
import { ease } from "@/lib/tokens";
import CustomCursor from "@/components/cursor/CustomCursor";
import ScrollProgress from "@/components/layout/ScrollProgress";

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
    registerGsap();
  }, []);

  return (
    <MotionConfig reducedMotion="never" transition={{ ease: [...ease.expo] }}>
      <CustomCursor />
      <ScrollProgress />
      {children}
    </MotionConfig>
  );
}
