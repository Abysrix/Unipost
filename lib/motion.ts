/**
 * UNIPOST MOTION PRESETS — reusable Framer Motion variants (ported from Bharvix).
 * Import these instead of writing inline variants. Reduced motion is handled at
 * the component level via usePrefersReducedMotion (see hooks).
 *
 * House rules: ease-out expo, 600–1400ms, transform + opacity only, reveal once.
 */

import type { Variants } from "framer-motion";
import { ease, duration, stagger } from "./tokens";

export const viewportOnce = { once: true, margin: "-80px" } as const;
export const viewportEager = { once: true, margin: "-40px" } as const;

/* FADE + RISE */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.expo } },
};
export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.expo } },
};
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.base, ease: ease.expo } },
};
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: duration.slow, ease: ease.expo } },
};
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  show: { opacity: 1, x: 0, transition: { duration: duration.slow, ease: ease.expo } },
};

/* CURTAIN REVEAL — the signature text entrance (wrap in overflow-hidden). */
export const curtainLine: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: duration.cinematic, ease: ease.expo } },
};

/* BLUR IN — logo letters / focal reveals */
export const blurIn: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: ease.expo } },
};

/* SCALE REVEAL — cards / panels */
export const scaleIn: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: duration.slow, ease: ease.expo } },
};

/* STAGGER CONTAINER */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.base, delayChildren: 0.1 } },
};

export function makeStagger(staggerChildren = stagger.base, delayChildren = 0.1): Variants {
  return { hidden: {}, show: { transition: { staggerChildren, delayChildren } } };
}

export function withDelay(variant: Variants, delay: number): Variants {
  const show = variant.show as Record<string, unknown>;
  const transition = (show?.transition as Record<string, unknown>) ?? {};
  return { ...variant, show: { ...show, transition: { ...transition, delay } } };
}

/* HOVER / TAP presets */
export const hoverLift = {
  whileHover: { y: -3, transition: { duration: 0.4, ease: ease.expo } },
  whileTap: { scale: 0.98 },
} as const;
export const hoverScale = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.96 },
} as const;

/** Spread onto a motion element: <motion.div {...reveal(fadeUp, 0.2)} /> */
export function reveal(variant: Variants = fadeUp, delay = 0) {
  return {
    variants: delay ? withDelay(variant, delay) : variant,
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: viewportOnce,
  };
}
