"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { spring } from "@/lib/tokens";

/**
 * Custom cursor — connective tissue of the whole site (ported from Bharvix).
 *  · Dot: near-instant, mix-blend-difference so it reads on any background.
 *  · Ring: heavy, trailing; grows on interactive elements and reveals a
 *    contextual label ("Open" / "View") via data-cursor-label.
 *  · Hidden on touch/coarse pointers.
 */
export default function CustomCursor() {
  const finePointer = useMediaQuery("(pointer: fine)");
  const [enabled, setEnabled] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isDown, setIsDown] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [label, setLabel] = useState<string | null>(null);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const dotX = useSpring(mouseX, spring.cursorDot);
  const dotY = useSpring(mouseY, spring.cursorDot);
  const ringX = useSpring(mouseX, spring.cursorRing);
  const ringY = useSpring(mouseY, spring.cursorRing);

  useEffect(() => setEnabled(finePointer), [finePointer]);

  const resolveTarget = useCallback((el: HTMLElement | null) => {
    if (!el) {
      setIsPointer(false);
      setLabel(null);
      return;
    }
    const interactive = el.closest("a, button, [role='button'], [data-cursor='pointer']");
    const labelEl = el.closest("[data-cursor-label]") as HTMLElement | null;
    setIsPointer(Boolean(interactive));
    setLabel(labelEl?.getAttribute("data-cursor-label") ?? null);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (hidden) setHidden(false);
      resolveTarget(e.target as HTMLElement);
    };
    const onDown = () => setIsDown(true);
    const onUp = () => setIsDown(false);
    const onLeave = () => setHidden(true);
    const onEnter = () => setHidden(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled, hidden, mouseX, mouseY, resolveTarget]);

  if (!enabled) return null;
  const ringScale = label ? 2.6 : isPointer ? 1.9 : isDown ? 0.8 : 1;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
      <motion.div
        className="fixed left-0 top-0 mix-blend-difference"
        style={{ x: dotX, y: dotY, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: hidden ? 0 : 1, scale: isPointer ? 0 : isDown ? 0.6 : 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </motion.div>

      <motion.div
        className="fixed left-0 top-0"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: hidden ? 0 : 1, scale: ringScale }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border transition-colors duration-300"
          style={{
            borderColor: isPointer ? "rgba(45,212,191,0.8)" : "rgba(255,255,255,0.35)",
            backgroundColor: label ? "rgba(45,212,191,0.16)" : "transparent",
            backdropFilter: label ? "blur(2px)" : "none",
          }}
        >
          <AnimatePresence>
            {label && (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="select-none whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.2em] text-white/80"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
