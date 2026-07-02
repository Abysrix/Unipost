"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export type PerfTier = "low" | "medium" | "high";

export interface DeviceCapability {
  tier: PerfTier;
  /** Recommended max devicePixelRatio for WebGL. */
  dpr: [number, number];
  /** Whether it's safe/worthwhile to mount WebGL. */
  enableWebGL: boolean;
  isMobile: boolean;
  reduced: boolean;
  ready: boolean;
}

/**
 * Device capability detection — decides how heavy WebGL/particle work should be.
 * SSR-safe: returns a conservative default until mounted. Consumers gate
 * particle counts, dpr and whether to mount the canvas at all.
 */
export function useDeviceCapability(): DeviceCapability {
  const reduced = usePrefersReducedMotion();
  const [cap, setCap] = useState<DeviceCapability>({
    tier: "medium",
    dpr: [1, 1.5],
    enableWebGL: false,
    isMobile: false,
    reduced,
    ready: false,
  });

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 4;
    const mem = nav.deviceMemory ?? 4;
    const isMobile = window.matchMedia("(pointer: coarse)").matches;

    let tier: PerfTier = "medium";
    if (cores >= 8 && mem >= 8 && !isMobile) tier = "high";
    else if (cores <= 4 || mem <= 4 || isMobile) tier = "low";

    setCap({
      tier,
      dpr: tier === "high" ? [1, 2] : tier === "low" ? [1, 1] : [1, 1.5],
      enableWebGL: !reduced && tier !== "low",
      isMobile,
      reduced,
      ready: true,
    });
  }, [reduced]);

  return cap;
}
