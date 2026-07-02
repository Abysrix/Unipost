"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export type HeadingLine = { text: string; variant?: "solid" | "stroke" | "aurora" | "violet" };

const lineClass: Record<NonNullable<HeadingLine["variant"]>, string> = {
  solid: "text-white",
  stroke: "text-stroke-white",
  aurora: "text-gradient-aurora",
  violet: "text-gradient-violet",
};

/**
 * SectionHeading — one unified section-heading scale + a reduced-safe curtain
 * reveal, reused everywhere (fixes Bharvix's per-section size drift).
 * The mask reveal is driven off a wrapper `useInView` (not the transformed
 * element), so it can never trap itself off-screen.
 */
export default function SectionHeading({
  lines,
  as = "h2",
  align = "left",
  className,
}: {
  lines: HeadingLine[];
  as?: "h1" | "h2";
  align?: "left" | "center";
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduced = usePrefersReducedMotion();
  const Tag = as;

  return (
    <Tag
      ref={ref}
      className={cn("font-display font-bold", align === "center" && "text-center", className)}
      style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)", lineHeight: 1, letterSpacing: "-0.04em" }}
    >
      {lines.map((line, i) => (
        <span key={line.text} className="block overflow-hidden py-[0.03em]">
          <motion.span
            className={cn("inline-block", lineClass[line.variant ?? "solid"])}
            initial={{ y: reduced ? "0%" : "110%" }}
            animate={inView ? { y: "0%" } : undefined}
            transition={{ duration: 1, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
          >
            {line.text}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
