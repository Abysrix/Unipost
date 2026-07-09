"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, ArrowDown } from "lucide-react";
import { gsap, registerGsap } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getPlatform } from "@/config/platforms";
import HeroDashboard from "./HeroDashboard";

const AuroraScene = dynamic(() => import("@/components/three/AuroraScene"), { ssr: false, loading: () => null });

const HEADLINE = "Publish Everywhere. From One Dashboard.";
const trustPlatforms = ["instagram", "youtube", "linkedin", "x"] as const;

/**
 * Hero — the flagship moment. Left: copy + CTAs + trust. Right: the living
 * dashboard. Aurora WebGL behind. A single GSAP timeline choreographs the whole
 * cinematic entrance once the loader lifts (`start`). Reduced motion → instant
 * (GSAP global timeScale), dashboard content still animates via its own guards.
 */
export default function Hero({ start = true }: { start?: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  // Hide entrance elements on mount so they don't flash in their final state
  // while the preloader curtain lifts (before `start` fires).
  useIsomorphicLayoutEffect(() => {
    registerGsap();
    if (!rootRef.current) return;
    const q = gsap.utils.selector(rootRef);
    gsap.set(q("[data-anim='aurora']"), { opacity: 0 });
    gsap.set(q("[data-anim='eyebrow'],[data-anim='sub'],[data-anim='buttons'],[data-anim='trust'],[data-anim='scroll']"), { opacity: 0, y: 20 });
    gsap.set(q("[data-anim='line']"), { yPercent: 118, opacity: 0 });
    gsap.set(q("[data-anim='dashboard']"), {
      opacity: 0, yPercent: 8, rotateY: -16, rotateX: 8, scale: 0.92,
      transformPerspective: 1400, transformOrigin: "50% 55%",
    });
    gsap.set(q("[data-anim='float']"), { opacity: 0, y: 34, scale: 0.9 });
  }, []);

  // Cinematic reveal once the loader lifts.
  useIsomorphicLayoutEffect(() => {
    if (!start || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(q("[data-anim='aurora']"), { opacity: 1, duration: 1.3 }, 0)
        .to(q("[data-anim='eyebrow']"), { opacity: 1, y: 0, duration: 0.7 }, 0.15)
        .to(q("[data-anim='line']"), { yPercent: 0, opacity: 1, duration: 1, stagger: 0.14 }, 0.2)
        .to(q("[data-anim='sub']"), { opacity: 1, y: 0, duration: 0.8 }, "-=0.55")
        .to(q("[data-anim='buttons']"), { opacity: 1, y: 0, duration: 0.8 }, "-=0.45")
        .to(q("[data-anim='trust']"), { opacity: 1, y: 0, duration: 0.6 }, "-=0.5")
        .to(
          q("[data-anim='dashboard']"),
          { opacity: 1, yPercent: 0, rotateY: 0, rotateX: 0, scale: 1, duration: 1.5 },
          0.55
        )
        .to(q("[data-anim='float']"), { opacity: 1, y: 0, scale: 1, stagger: 0.16, duration: 0.9 }, "-=0.85")
        .to(q("[data-anim='scroll']"), { opacity: 1, duration: 0.6 }, "-=0.3");
    }, rootRef);
    return () => ctx.revert();
  }, [start]);

  return (
    <section ref={rootRef} id="hero" className="relative flex min-h-[100svh] items-center overflow-hidden">
      {/* Aurora background */}
      <div data-anim="aurora" className="pointer-events-none absolute inset-0 z-0">
        <AuroraScene />
      </div>
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgba(5,5,8,0.75) 100%)" }}
      />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-14 pb-24 pt-32 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pt-28">
          {/* ---------- LEFT: copy ---------- */}
          <div className="max-w-xl">
            <div
              data-anim="eyebrow"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 backdrop-blur-sm"
            >
              <span className="text-aurora-cyan">✦</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
                India&apos;s Creator Operating System
              </span>
            </div>

            <h1
              aria-label={HEADLINE}
              className="mb-7 font-display font-bold text-white"
              style={{ fontSize: "clamp(2.6rem, 6vw, 5.4rem)", lineHeight: 0.98, letterSpacing: "-0.04em" }}
            >
              <span aria-hidden className="block overflow-hidden py-[0.06em]">
                <span data-anim="line" className="inline-block">Publish Everywhere.</span>
              </span>
              <span aria-hidden className="block overflow-hidden py-[0.06em]">
                <span data-anim="line" className="inline-block">
                  From <span className="text-gradient-aurora">One Dashboard.</span>
                </span>
              </span>
            </h1>

            <p data-anim="sub" className="mb-9 max-w-lg text-base leading-relaxed text-white/50 md:text-lg">
              Plan, create, schedule, analyze and grow across every platform from
              one AI-powered workspace built for India&apos;s creators.
            </p>

            <div data-anim="buttons" className="flex flex-wrap items-center gap-4">
              <Button href="/signup" variant="aurora" size="lg" arrow cursorLabel="Start">
                Start Free Trial
              </Button>
              <Button variant="secondary" size="lg" magnetic onClick={() => setDemoOpen(true)} cursorLabel="Play">
                <span className="inline-flex items-center gap-2">
                  <Play size={14} /> Watch Demo
                </span>
              </Button>
            </div>

            {/* Trust signal */}
            <div data-anim="trust" className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {trustPlatforms.map((id) => {
                  const p = getPlatform(id)!;
                  return (
                    <span
                      key={id}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-bg-primary text-[10px] font-bold"
                      style={{ background: `${p.color}26`, color: p.color }}
                      aria-hidden
                    >
                      {p.glyph}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs leading-relaxed text-white/35">
                Trusted by creators across Instagram, YouTube, LinkedIn and X.
              </p>
            </div>
          </div>

          {/* ---------- RIGHT: living dashboard ---------- */}
          <div className="relative">
            <HeroDashboard start={start} />
          </div>
        </div>
      </Container>

      {/* Scroll indicator */}
      <div
        data-anim="scroll"
        aria-hidden
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">Scroll</span>
        <div className="relative h-10 w-px overflow-hidden bg-white/10">
          <span className="absolute left-0 top-0 h-4 w-px animate-[scrollDot_2.2s_ease-in-out_infinite] bg-gradient-to-b from-aurora-cyan to-transparent" />
        </div>
        <ArrowDown size={12} className="text-white/25" />
      </div>

      {/* Bottom fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-32"
        style={{ background: "linear-gradient(to top, #050508 0%, transparent 100%)" }}
      />

      {/* Watch Demo modal */}
      <Modal open={demoOpen} onClose={() => setDemoOpen(false)} title="UniPost — product demo">
        <div className="flex aspect-video items-center justify-center rounded-xl border border-white/[0.08] bg-black/40">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
              <Play size={20} className="ml-0.5 text-black/80" />
            </span>
            <span className="text-sm text-white/50">Full product walkthrough — coming soon.</span>
          </div>
        </div>
      </Modal>
    </section>
  );
}
