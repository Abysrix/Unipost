"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useInView } from "framer-motion";
import { Link2, PenTool, CalendarClock, Send, TrendingUp, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Section from "@/components/ui/Section";
import Eyebrow from "@/components/ui/Eyebrow";
import SectionHeading from "@/components/ui/SectionHeading";

const steps: { icon: LucideIcon; label: string; body: string; color: string }[] = [
  { icon: Link2, label: "Connect", body: "Link Instagram, YouTube, LinkedIn and X in seconds — one secure login each.", color: "#22d3ee" },
  { icon: PenTool, label: "Create", body: "Generate captions, hooks and scripts with AI that writes in your voice.", color: "#2dd4bf" },
  { icon: CalendarClock, label: "Schedule", body: "Auto-queue every post at each platform's peak time. Set it once.", color: "#34d399" },
  { icon: Send, label: "Publish", body: "One click sends it everywhere, instantly — no more copy-paste.", color: "#a3e635" },
  { icon: TrendingUp, label: "Grow", body: "See what's working across platforms and let the coach guide your next move.", color: "#facc15" },
  { icon: Repeat, label: "Repeat", body: "Every cycle compounds. Consistency becomes a habit — and a streak.", color: "#22d3ee" },
];

function Step({ step, index }: { step: (typeof steps)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const Icon = step.icon;
  return (
    <motion.div
      ref={ref}
      className="relative flex items-start gap-6 pb-14 last:pb-0"
      initial={{ opacity: 0, x: 24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border"
        style={{ borderColor: `${step.color}45`, background: "#070710" }}
        animate={inView ? { boxShadow: [`0 0 0 ${step.color}00`, `0 0 26px ${step.color}55`, `0 0 10px ${step.color}22`] } : {}}
        transition={{ duration: 1.4, delay: index * 0.05 }}
      >
        <Icon size={20} style={{ color: step.color }} strokeWidth={1.75} />
      </motion.div>
      <div className="pt-2">
        <div className="mb-1.5 flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.15em]" style={{ color: `${step.color}b0` }}>{String(index + 1).padStart(2, "0")}</span>
          <h3 className="font-display text-xl font-bold text-white">{step.label}</h3>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/45">{step.body}</p>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start center", "end center"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <Section id="how-it-works" overflowHidden>
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2 lg:gap-24">
        <div className="lg:sticky lg:top-32">
          <div className="mb-6"><Eyebrow index={5}>How It Works</Eyebrow></div>
          <SectionHeading lines={[{ text: "From first idea" }, { text: "to viral, on loop.", variant: "aurora" }]} />
          <p className="mt-8 max-w-sm text-sm leading-relaxed text-white/45">
            UniPost turns the messy, five-app creator workflow into one calm loop
            you can run every single day.
          </p>
        </div>

        <div ref={railRef} className="relative">
          {/* rail track + scroll fill (aligned to node centers at left-7) */}
          <div className="absolute bottom-7 left-7 top-7 w-px -translate-x-1/2 bg-white/[0.06]" />
          <motion.div className="absolute left-7 top-7 w-px -translate-x-1/2 origin-top [background:linear-gradient(to_bottom,#22d3ee,#34d399,#facc15)]" style={{ bottom: 28, scaleY: fill }} />
          {steps.map((s, i) => <Step key={s.label} step={s} index={i} />)}
        </div>
      </div>
    </Section>
  );
}
