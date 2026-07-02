/**
 * GSAP — centralized registration, configuration & reusable helpers.
 * Import `{ gsap, ScrollTrigger }` from here, NEVER from "gsap" directly.
 *
 * Ownership boundary (inherited from Bharvix):
 *   GSAP owns → scroll-scrubbed timelines, pinning, scroll parallax.
 *   Framer Motion owns → component enter/exit, gestures.
 *   Lenis drives the GSAP ticker (see hooks/useLenis) → one master clock.
 */

"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.globalTimeline.timeScale(200); // effectively instant
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  registered = true;
}

/** Kill all triggers (call in a section/route cleanup). */
export function killScrollTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

/* ------------------------------------------------------------------ *
 * REUSABLE HELPERS — build these instead of hand-writing timelines.
 * All return a cleanup-friendly value; use inside a gsap.context().
 * ------------------------------------------------------------------ */

/** Scrub a timeline while pinning `stage` for `distance` px of scroll. */
export function createPinnedTimeline(
  stage: Element,
  {
    distance = 3000,
    scrub = 1,
    start = "top top",
  }: { distance?: number; scrub?: number | boolean; start?: string } = {}
) {
  return gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: {
      trigger: stage,
      start,
      end: `+=${distance}`,
      scrub,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
}

/** Reveal `targets` (rise + fade) as they enter the viewport. */
export function createScrollReveal(
  targets: gsap.TweenTarget,
  {
    y = 40,
    stagger = 0.08,
    start = "top 85%",
    duration = 1,
  }: { y?: number; stagger?: number; start?: string; duration?: number } = {}
) {
  return gsap.from(targets, {
    y,
    opacity: 0,
    duration,
    stagger,
    ease: "power3.out",
    scrollTrigger: { trigger: targets as Element, start },
  });
}

/** Scroll-linked parallax: moves `target` by `amount` px over its scroll range. */
export function createParallax(
  target: Element,
  { amount = 100, start = "top bottom", end = "bottom top" } = {}
) {
  return gsap.to(target, {
    y: amount,
    ease: "none",
    scrollTrigger: { trigger: target, start, end, scrub: true },
  });
}

export { gsap, ScrollTrigger };
