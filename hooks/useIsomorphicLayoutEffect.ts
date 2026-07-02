"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect on the client, useEffect on the server — avoids React's SSR
 * warning while still running layout-critical effects (GSAP/SplitType) before paint.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
