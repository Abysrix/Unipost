"use client";

import { useRef } from "react";
import { gsap, registerGsap } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/**
 * Run a GSAP setup inside a scoped, auto-cleaned context.
 * Registers plugins once, scopes selectors to the returned ref, and reverts all
 * animations/ScrollTriggers on unmount. The standard way to wire GSAP in a section.
 *
 *   const scope = useGsapContext<HTMLDivElement>((self) => {
 *     const q = gsap.utils.selector(self);
 *     gsap.from(q(".line"), { yPercent: 110, stagger: 0.08 });
 *   });
 *   <section ref={scope}> … </section>
 */
export function useGsapContext<T extends HTMLElement = HTMLDivElement>(
  setup: (self: T) => void,
  deps: React.DependencyList = []
): React.RefObject<T> {
  const scope = useRef<T>(null);

  useIsomorphicLayoutEffect(() => {
    registerGsap();
    if (!scope.current) return;
    const self = scope.current;
    const ctx = gsap.context(() => setup(self), self);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}
