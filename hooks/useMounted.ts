"use client";

import { useEffect, useState } from "react";

/**
 * True after the first client render. Guard client-only UI (cursor, WebGL,
 * portals) with this to avoid hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
