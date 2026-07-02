"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Bot, Sparkles, Flame, Trophy, Check } from "lucide-react";
import Section from "@/components/ui/Section";
import Eyebrow from "@/components/ui/Eyebrow";
import SectionHeading from "@/components/ui/SectionHeading";
import Confetti from "@/components/ui/Confetti";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useCountUp } from "@/hooks/useCountUp";

/* ---------------- AI Growth Coach conversation ---------------- */
function CoachChat() {
  const ref = useRef(null);
  const live = useInView(ref, { once: true, margin: "-120px" });
  const { text, done } = useTypewriter(
    "Reach dipped 12% — you posted late 3 days this week. Your audience peaks Mon–Wed, 7 PM. Fix it in one tap:",
    { active: live, speed: 22, startDelay: 500 }
  );

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl [background:linear-gradient(120deg,#22d3ee,#34d399)]"><Bot size={15} className="text-black/80" /></span>
        <div>
          <div className="text-sm font-semibold text-white">Growth Coach</div>
          <div className="flex items-center gap-1 text-[10px] text-aurora-green"><span className="h-1 w-1 rounded-full bg-aurora-green" /> online</div>
        </div>
      </div>

      {/* user message */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={live ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="mb-3 ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-sm bg-white/[0.06] px-4 py-2.5 text-[13px] text-white/75">
        Why did my reach drop this week?
      </motion.div>

      {/* AI response */}
      <div className="w-fit max-w-[88%] rounded-2xl rounded-tl-sm border border-aurora-teal/20 bg-aurora-teal/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/75">
        {text || <span className="text-white/30">typing…</span>}
        {!done && text && <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-aurora-cyan align-middle" />}
      </div>

      {/* suggestion chips */}
      <motion.div className="mt-4 flex flex-wrap gap-2" initial={{ opacity: 0 }} animate={done ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
        {["📅 Schedule Mon 7 PM", "🎬 Add 2 reels", "🪝 Reuse top hook"].map((s, i) => (
          <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 + i * 0.1 }}
            className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:border-aurora-teal/40 hover:text-white">
            {s}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------------- Creator Score showcase ---------------- */
function ScoreShowcase() {
  const ref = useRef(null);
  const live = useInView(ref, { once: true, margin: "-120px" });
  const R = 46, C = 2 * Math.PI * R;
  const score = useCountUp(84, { active: live, duration: 1800 });

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl">
      <Confetti fire={live} />
      <div className="flex items-center gap-6">
        <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="url(#scoreGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={live ? C * (1 - score / 100) : C} style={{ transition: "stroke-dashoffset 0.1s linear", filter: "drop-shadow(0 0 8px rgba(45,212,191,0.5))" }} />
            <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#facc15" /></linearGradient></defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-3xl font-bold text-white">{Math.round(score)}</span>
            <span className="text-[9px] uppercase tracking-wider text-white/30">Score</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2"><span className="font-display text-xl font-bold text-white">Level 7</span><span className="rounded-full bg-aurora-teal/15 px-2 py-0.5 text-[10px] text-aurora-teal">Creator</span></div>
          <div className="mb-1.5 flex justify-between text-[11px] text-white/40"><span>XP</span><span>720 / 1000</span></div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div className="h-full rounded-full [background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)]" initial={{ width: 0 }} animate={live ? { width: "72%" } : {}} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-orange-400"><Flame size={13} /> 12-day streak · keep it alive</div>
        </div>
      </div>

      {/* achievements */}
      <div className="mt-6 grid grid-cols-4 gap-2">
        {[{ e: "🔥", l: "On Fire" }, { e: "⚡", l: "Fast Riser" }, { e: "🏆", l: "Top 5%" }, { e: "✨", l: "Consistent" }].map((a, i) => (
          <motion.div key={a.l} initial={{ opacity: 0, scale: 0.8 }} animate={live ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.4 + i * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] py-3">
            <span className="text-lg">{a.e}</span>
            <span className="text-[9px] text-white/40">{a.l}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function WhyUnipost() {
  return (
    <Section id="why" overflowHidden>
      <div className="flex flex-col items-center text-center">
        <div className="mb-6"><Eyebrow index={7}>Why UniPost</Eyebrow></div>
        <SectionHeading align="center" lines={[{ text: "Not another scheduler." }, { text: "An unfair advantage.", variant: "aurora" }]} />
        <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/45">
          Two things Buffer and Hootsuite will never give you — a coach that
          grows you, and a game that keeps you consistent.
        </p>
      </div>

      {/* Row A — AI Growth Coach */}
      <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <CoachChat />
        <div>
          <div className="mb-4 flex items-center gap-2"><Sparkles size={16} className="text-aurora-cyan" /><span className="font-mono text-[11px] uppercase tracking-[0.2em] text-aurora-cyan">AI Growth Coach</span></div>
          <h3 className="mb-4 font-display text-2xl font-bold text-white md:text-3xl" style={{ letterSpacing: "-0.02em" }}>It reads your data. Then tells you exactly what to do next.</h3>
          <p className="mb-6 text-sm leading-relaxed text-white/45">Not a dashboard you have to interpret. A coach that explains your numbers in plain English and hands you the next move — already scheduled.</p>
          <ul className="flex flex-col gap-3">
            {["Interprets your analytics automatically", "Recommends the exact post, time and format", "Learns your voice and audience over time"].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/60"><Check size={15} className="mt-0.5 shrink-0 text-aurora-green" strokeWidth={2} />{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Row B — Creator Score */}
      <div className="mt-20 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="mb-4 flex items-center gap-2"><Trophy size={16} className="text-aurora-yellow" /><span className="font-mono text-[11px] uppercase tracking-[0.2em] text-aurora-yellow">Creator Score</span></div>
          <h3 className="mb-4 font-display text-2xl font-bold text-white md:text-3xl" style={{ letterSpacing: "-0.02em" }}>Consistency, finally made addictive.</h3>
          <p className="mb-6 text-sm leading-relaxed text-white/45">Earn XP for every post, level up your Creator Score, unlock achievements and protect your streak. The same psychology that keeps you on Duolingo — pointed at your growth.</p>
          <ul className="flex flex-col gap-3">
            {["XP, levels and a live Creator Score", "Streaks that reward showing up daily", "Achievements for every milestone"].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/60"><Check size={15} className="mt-0.5 shrink-0 text-aurora-green" strokeWidth={2} />{f}</li>
            ))}
          </ul>
        </div>
        <div className="order-1 lg:order-2"><ScoreShowcase /></div>
      </div>
    </Section>
  );
}
