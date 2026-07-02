"use client";

import { motion } from "framer-motion";
import Marquee from "@/components/motion/Marquee";
import { platforms } from "@/config/platforms";

/**
 * TrustBar — a premium credibility strip directly under the Hero.
 * Infinite platform marquee, edge fade, hover-pause. Bridges Hero → Analytics.
 */
export default function TrustBar() {
  const items = [...platforms, ...platforms];

  return (
    <section aria-label="Supported platforms" className="relative border-y border-white/[0.05] py-10">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-7 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-white/30"
      >
        Publish to every platform your audience lives on
      </motion.p>

      <Marquee speed={34} pauseOnHover fade>
        {items.map((p, i) => (
          <div key={i} className="mx-8 flex items-center gap-3 opacity-60 transition-opacity duration-300 hover:opacity-100">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
              style={{ background: `${p.color}18`, border: `1px solid ${p.color}33`, color: p.color }}
              aria-hidden
            >
              {p.glyph}
            </span>
            <span className="font-display text-lg font-semibold text-white/70">{p.name}</span>
          </div>
        ))}
      </Marquee>
    </section>
  );
}
