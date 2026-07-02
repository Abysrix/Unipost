"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import AuroraBackdrop from "@/components/three/AuroraBackdrop";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * FinalCTA — the strongest conversion moment. Breathing aurora glow, ambient
 * particles, magnetic buttons. Reuses the Button primitive (magnetic + arrow).
 */
export default function FinalCTA() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="early-access" className="relative overflow-hidden py-32 md:py-44">
      <AuroraBackdrop intensity={1.2} />

      {/* Breathing central glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(45,212,191,0.22) 0%, rgba(34,211,238,0.10) 40%, transparent 70%)", filter: "blur(60px)" }}
        animate={reduced ? {} : { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* faint particle dots */}
      {!reduced && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-aurora-teal/50"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
              animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      <Container className="relative z-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.span initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 inline-flex items-center gap-2 rounded-full border border-aurora-teal/25 bg-aurora-teal/[0.07] px-4 py-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-aurora-teal" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-aurora-teal/80">Early access · Free to start</span>
          </motion.span>

          <h2 className="font-display font-bold text-white" style={{ fontSize: "clamp(2.6rem, 6.5vw, 6rem)", lineHeight: 0.98, letterSpacing: "-0.04em" }}>
            <span className="block overflow-hidden py-[0.05em]">
              <motion.span className="inline-block" initial={{ y: "110%" }} whileInView={{ y: "0%" }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
                Ready to <span className="text-gradient-aurora">grow</span> your
              </motion.span>
            </span>
            <span className="block overflow-hidden py-[0.05em]">
              <motion.span className="inline-block" initial={{ y: "110%" }} whileInView={{ y: "0%" }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}>
                audience?
              </motion.span>
            </span>
          </h2>

          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-7 max-w-lg text-base leading-relaxed text-white/50">
            Join India&apos;s next generation of creators using UniPost to build,
            schedule, analyze and grow — all from one workspace.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.45 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="#early-access" variant="aurora" size="lg" arrow cursorLabel="Start">Start Free Trial</Button>
            <Button href="#early-access" variant="secondary" size="lg" cursorLabel="Book">
              <span className="inline-flex items-center gap-2"><Calendar size={14} /> Book Demo</span>
            </Button>
          </motion.div>

          <p className="mt-6 text-xs text-white/30">No credit card required · Free forever plan</p>
        </div>
      </Container>
    </section>
  );
}
