"use client";

import { motion } from "framer-motion";
import { Sparkles, Bot, CalendarClock, BarChart3, Briefcase, Trophy, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Section from "@/components/ui/Section";
import Eyebrow from "@/components/ui/Eyebrow";
import SectionHeading from "@/components/ui/SectionHeading";
import GlassCard from "@/components/ui/GlassCard";
import Reveal from "@/components/motion/Reveal";

function CardShell({ icon: Icon, accent, title, desc, children, className, span }: {
  icon: LucideIcon; accent: string; title: string; desc: string; children?: React.ReactNode; className?: string; span?: string;
}) {
  return (
    <Reveal variant="fade-up" className={span}>
      <GlassCard accent={accent} className={`h-full ${className ?? ""}`}>
        <div className="flex h-full flex-col">
          <div
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
            style={{ background: `${accent}18`, border: `1px solid ${accent}33` }}
          >
            <Icon size={18} style={{ color: accent }} strokeWidth={1.75} />
          </div>
          <h3 className="mb-2 font-display text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm leading-relaxed text-white/45">{desc}</p>
          {children}
        </div>
      </GlassCard>
    </Reveal>
  );
}

export default function CreatorOS() {
  return (
    <Section id="features" overflowHidden>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 h-[500px] w-[700px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="mb-6"><Eyebrow index={3}>The Creator OS</Eyebrow></div>
      <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading lines={[{ text: "Everything a creator needs." }, { text: "Nothing they don't.", variant: "aurora" }]} />
        <p className="max-w-sm text-sm leading-relaxed text-white/45 md:text-right">
          Five tools became one operating system — from the first idea to the
          brand deal that pays for it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* AI Content Engine — wide */}
        <CardShell icon={Sparkles} accent="#22d3ee" title="AI Content Engine" desc="Generate captions, hooks, scripts and post ideas in your own voice — then remix one idea into every format." span="lg:col-span-2">
          <div className="mt-5 flex flex-wrap gap-2">
            {["Captions", "Hooks", "Hashtags", "Repurpose", "Ideas"].map((t, i) => (
              <motion.span key={t} className="rounded-full border border-aurora-cyan/25 bg-aurora-cyan/10 px-3 py-1 text-[11px] text-aurora-cyan"
                initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.06 }}>
                {t}
              </motion.span>
            ))}
          </div>
        </CardShell>

        {/* AI Growth Coach */}
        <CardShell icon={Bot} accent="#2dd4bf" title="AI Growth Coach" desc="A coach that reads your analytics and tells you exactly what to post next — and when." />

        {/* Scheduling */}
        <CardShell icon={CalendarClock} accent="#34d399" title="Smart Scheduling" desc="Auto-schedule to every platform at each one's peak time. Set it once, publish everywhere." />

        {/* Unified Analytics */}
        <CardShell icon={BarChart3} accent="#a3e635" title="Unified Analytics" desc="Every platform's numbers in one dashboard, explained in plain language." />

        {/* Brand Deal Manager */}
        <CardShell icon={Briefcase} accent="#facc15" title="Brand Deal Manager" desc="Track pitches, contracts, deliverables and payments — never miss a deadline again." />

        {/* Creator Score — full width */}
        <CardShell icon={Trophy} accent="#22d3ee" title="Creator Score, XP & Streaks" desc="Turn consistency into a game. Earn XP for every post, level up, keep your streak alive." span="lg:col-span-3">
          <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="font-display text-4xl font-bold text-gradient-aurora">Lv 7</div>
              <div className="w-40">
                <div className="mb-1 flex justify-between text-[10px] text-white/40"><span>XP</span><span>720 / 1000</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div className="h-full rounded-full [background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)]" initial={{ width: 0 }} whileInView={{ width: "72%" }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
                </div>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-400"><Flame size={13} /> 12-day streak</span>
            <div className="flex gap-2">
              {["🔥", "⚡", "🏆", "✨"].map((e) => (
                <span key={e} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm">{e}</span>
              ))}
            </div>
          </div>
        </CardShell>
      </div>
    </Section>
  );
}
