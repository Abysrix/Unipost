"use client";

import { useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tooltip — lightweight hover/focus label. Accessible via aria-describedby.
 * Appears on both hover and keyboard focus so it works without a pointer.
 */
export default function Tooltip({
  children,
  label,
  side = "top",
  className,
}: {
  children: React.ReactNode;
  label: string;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const pos =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2";

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-none absolute z-[500] whitespace-nowrap rounded-lg border border-white/[0.1] bg-bg-elevated px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/70 shadow-lg",
              pos
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
