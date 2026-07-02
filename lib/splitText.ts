"use client";

import SplitType from "split-type";

/**
 * SplitType helper — split an element into lines / words / chars for GSAP/Framer
 * character reveals, and return a revert() to restore the DOM (important for
 * responsive re-splitting and cleanup).
 *
 * Usage inside a gsap.context / useEffect:
 *   const split = splitText(el, "words,chars");
 *   gsap.from(split.chars, { yPercent: 110, stagger: 0.02 });
 *   return () => split.revert();
 */
export type SplitTypesArg = "lines" | "words" | "chars" | string;

export function splitText(
  target: HTMLElement | string,
  types: SplitTypesArg = "lines,words"
): SplitType {
  return new SplitType(target as HTMLElement, {
    types: types as never,
    tagName: "span",
  });
}

/** Re-split on resize; returns a disposer that removes the listener + reverts. */
export function responsiveSplit(
  target: HTMLElement,
  types: SplitTypesArg,
  onSplit: (split: SplitType) => void
): () => void {
  let split = splitText(target, types);
  onSplit(split);

  let raf = 0;
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      split.revert();
      split = splitText(target, types);
      onSplit(split);
    });
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    cancelAnimationFrame(raf);
    split.revert();
  };
}
