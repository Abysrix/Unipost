"use client";

import { useRef } from "react";
import { gsap, registerGsap } from "@/lib/gsap";
import { responsiveSplit } from "@/lib/splitText";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { cn } from "@/lib/utils";

/**
 * SplitText — word/char curtain reveal on scroll, powered by SplitType + GSAP.
 * Re-splits on resize and reverts the DOM on cleanup. Reduced motion → static.
 */
export default function SplitText({
  children,
  type = "words",
  stagger = 0.05,
  as: Tag = "span",
  className,
}: {
  children: string;
  type?: "words" | "chars" | "lines";
  stagger?: number;
  as?: "span" | "h1" | "h2" | "p";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useIsomorphicLayoutEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el || reduced) return;

    const dispose = responsiveSplit(el, type, (split) => {
      const targets = (split[type] ?? []) as Element[];
      if (!targets.length) return;
      gsap.set(el, { autoAlpha: 1 });
      gsap.from(targets, {
        yPercent: 115,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
    return dispose;
  }, [reduced, type, stagger]);

  return (
    <Tag
      ref={ref as never}
      className={cn(className)}
      style={{ visibility: reduced ? "visible" : undefined }}
    >
      {children}
    </Tag>
  );
}
