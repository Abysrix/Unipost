"use client";

import { motion, type Variants } from "framer-motion";
import { fadeUp, fadeUpSmall, fadeIn, fadeLeft, fadeRight, scaleIn, blurIn, withDelay, viewportOnce } from "@/lib/motion";

const variants: Record<string, Variants> = {
  "fade-up": fadeUp,
  "fade-up-small": fadeUpSmall,
  "fade-in": fadeIn,
  "fade-left": fadeLeft,
  "fade-right": fadeRight,
  "scale-in": scaleIn,
  "blur-in": blurIn,
};

export type RevealVariant = keyof typeof variants;

/**
 * Reveal — declarative scroll reveal. Wraps children in a motion element that
 * plays a preset variant once in view. The everyday building block.
 *
 *   <Reveal variant="fade-up" delay={0.1}><h2>…</h2></Reveal>
 */
export default function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  as = "div",
  className,
}: {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  as?: "div" | "span" | "li" | "section";
  className?: string;
}) {
  const MotionTag = motion[as] as typeof motion.div;
  const chosen = delay ? withDelay(variants[variant], delay) : variants[variant];
  return (
    <MotionTag variants={chosen} initial="hidden" whileInView="show" viewport={viewportOnce} className={className}>
      {children}
    </MotionTag>
  );
}
