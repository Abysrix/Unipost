"use client";

import { motion } from "framer-motion";
import { useScrollProgress } from "@/hooks/useScrollProgress";

/**
 * Global scroll-progress bar — a 2px aurora line pinned to the top of the
 * viewport. Transform-only (scaleX), so it costs nothing.
 */
export default function ScrollProgress() {
  const progress = useScrollProgress();
  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-[90] h-px w-full origin-left"
      style={{
        scaleX: progress,
        background: "linear-gradient(90deg, #22d3ee, #34d399, #facc15)",
      }}
    />
  );
}
