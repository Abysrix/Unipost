"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

let lenisInstance: Lenis | null = null;

/** Access the global Lenis instance (e.g. for programmatic scrollTo). */
export function getLenis(): Lenis | null {
  return lenisInstance;
}

/**
 * Global smooth scroll. Lenis owns scroll position for the whole app and drives
 * the GSAP ticker so ScrollTrigger stays in sync (one master clock).
 * Mounted once in AppProviders.
 */
export function useLenis() {
  const pathname = usePathname();
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const isAuth = ["/login", "/signup", "/forgot-password", "/reset-password"].some(p => pathname?.startsWith(p));
    if (isAuth) return;

    const lenis = new Lenis({
      duration: 1.6,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.8,
      syncTouch: true,
    });
    lenisInstance = lenis;

    const setup = async () => {
      try {
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } catch {
        const raf = (time: number) => {
          lenis.raf(time);
          rafIdRef.current = requestAnimationFrame(raf);
        };
        rafIdRef.current = requestAnimationFrame(raf);
      }
    };
    setup();

    return () => {
      lenis.destroy();
      lenisInstance = null;
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);
}
