"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notifications } from "./data";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Floating toast that cycles real-time notifications — slides in, holds, out. */
export default function NotificationToast({ live }: { live: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!live) return;
    let mounted = true;
    const first = setTimeout(() => mounted && setShow(true), 2000);
    if (reduced) return () => clearTimeout(first);

    const cycle = setInterval(() => {
      if (!mounted) return;
      setShow(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % notifications.length);
        setShow(true);
      }, 500);
    }, 4200);
    return () => {
      mounted = false;
      clearTimeout(first);
      clearInterval(cycle);
    };
  }, [live, reduced]);

  const n = notifications[index];

  return (
    <div className="pointer-events-none h-[52px] w-[236px]">
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.1] px-3.5 py-3 backdrop-blur-xl"
            style={{ background: "rgba(10,12,18,0.85)", boxShadow: "0 20px 50px -18px rgba(0,0,0,0.6)" }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-sm">{n.emoji}</span>
            <span className="text-[11px] font-medium leading-tight text-white/75">{n.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
