"use client";

import { motion } from "framer-motion";
import { useParallax } from "@/hooks/useParallax";
import { cn } from "@/lib/utils";

/**
 * Parallax — moves its children on scroll (transform-only, spring-smoothed).
 * Disabled under reduced motion via the underlying hook.
 */
export default function Parallax({
  children,
  distance = 100,
  className,
}: {
  children: React.ReactNode;
  distance?: number;
  className?: string;
}) {
  const { ref, value } = useParallax<HTMLDivElement>({ distance });
  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div style={{ y: value }}>{children}</motion.div>
    </div>
  );
}
