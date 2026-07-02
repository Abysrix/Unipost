"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { formatNumber, cn } from "@/lib/utils";

/**
 * AnimatedCounter — counts 0 → value when scrolled into view.
 * Wraps useCountUp; reduced motion jumps to the final value.
 */
export default function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1800,
  format = true,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  /** Group digits (1,240) — off for years/scores. */
  format?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const current = useCountUp(value, { active: inView, duration });

  const rounded = decimals > 0 ? Number(current.toFixed(decimals)) : Math.round(current);
  const display = format ? formatNumber(rounded) : String(rounded);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
