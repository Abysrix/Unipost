"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Eyebrow — the running, numbered section label.
 * Turns Bharvix's repeated eyebrow into an authored index system:
 *   01 —— WHO WE ARE
 * Pass `index` for the running number; omit it for a plain label.
 */
export default function Eyebrow({
  children,
  index,
  accent = "aurora",
  className,
}: {
  children: React.ReactNode;
  index?: number;
  accent?: "aurora" | "violet";
  className?: string;
}) {
  const accentColor = accent === "aurora" ? "rgba(45,212,191,0.75)" : "rgba(167,139,250,0.7)";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={cn(
        "flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]",
        className
      )}
    >
      {index != null && (
        <>
          <span className="tabular-nums text-white/35">
            {String(index).padStart(2, "0")}
          </span>
          <span className="h-px w-7" style={{ backgroundColor: accentColor }} />
        </>
      )}
      <span style={{ color: accentColor }}>{children}</span>
    </motion.div>
  );
}
