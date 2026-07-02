"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Toggle — a two-option segmented control with a sliding aurora pill.
 * Accessible (radiogroup semantics); used for the pricing monthly/yearly switch.
 */
export default function Toggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-sm",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300",
              active ? "text-black" : "text-white/50 hover:text-white/80"
            )}
          >
            {active && (
              <motion.span
                layoutId="toggle-pill"
                className="absolute inset-0 rounded-full [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
            {opt.hint && (
              <span className={cn("relative z-10 rounded-full px-1.5 py-0.5 text-[9px]", active ? "bg-black/20 text-black/70" : "bg-aurora-teal/15 text-aurora-teal")}>
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
