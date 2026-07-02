"use client";

import { useEffect, useState } from "react";
import { breakpoints, type Breakpoint } from "@/config/site";

/** SSR-safe media query hook. false on server + first render, real value after mount. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** True when viewport is >= the given breakpoint (mobile-first). */
export function useBreakpoint(bp: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[bp]}px)`);
}

/** True below the `lg` breakpoint. */
export function useIsMobile(): boolean {
  return !useBreakpoint("lg");
}
