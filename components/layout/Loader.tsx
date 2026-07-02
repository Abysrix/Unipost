"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORD = "UNIPOST";

/**
 * Loader — a ritual, not a spinner (ported from Bharvix, aurora-themed).
 * The wordmark starts as an outline; an aurora fill WIPES across it driven by
 * the load percentage. At 100% the curtain lifts to reveal the page beneath.
 */
export default function Loader({ onComplete }: { onComplete?: () => void }) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const DURATION = 1950;
    let last = performance.now();
    let acc = 0;

    const tick = (now: number) => {
      let dt = now - last;
      last = now;
      if (dt > 33) dt = 33;
      acc += dt;
      const t = Math.min(acc / DURATION, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setPct(Math.round(eased * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else t1 = setTimeout(() => {
        setDone(true);
        t2 = setTimeout(() => onComplete?.(), 1000);
      }, 260);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "#050508" }}
          exit={{ clipPath: "inset(0 0 100% 0)", scale: 1.06, transition: { duration: 1.0, ease: [0.76, 0, 0.24, 1] } }}
        >
          <div className="noise-overlay absolute inset-0" />
          <div
            aria-hidden
            className="pointer-events-none absolute h-[600px] w-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(45,212,191,0.35) 0%, transparent 70%)",
              filter: "blur(50px)",
              opacity: 0.1 + (pct / 100) * 0.22,
              transform: `scale(${0.8 + (pct / 100) * 0.3})`,
            }}
          />

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            exit={{ y: -44, opacity: 0, scale: 0.97, transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } }}
          >
            <span
              className="block select-none font-display font-bold"
              style={{ fontSize: "clamp(2.8rem, 9vw, 7rem)", letterSpacing: "-0.04em", color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.22)" }}
            >
              {WORD}
            </span>
            <span
              className="absolute inset-0 block select-none font-display font-bold text-gradient-aurora"
              style={{ fontSize: "clamp(2.8rem, 9vw, 7rem)", letterSpacing: "-0.04em", clipPath: `inset(0 ${100 - pct}% 0 0)` }}
            >
              {WORD}
            </span>
          </motion.div>

          <motion.p
            className="mt-5 font-mono text-[10px] uppercase tracking-[0.4em] text-white/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Creator OS · India
          </motion.p>

          <div className="absolute bottom-8 left-0 right-0 flex items-end justify-between px-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/25">Loading</span>
            <span className="font-display font-bold tabular-nums text-white/70" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.03em" }}>
              {String(pct).padStart(3, "0")}
              <span className="ml-0.5 align-top text-base text-white/25">%</span>
            </span>
          </div>

          <div className="absolute bottom-0 left-0 h-px w-full bg-white/5">
            <div className="h-full [background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)]" style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(45,212,191,0.6)" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
