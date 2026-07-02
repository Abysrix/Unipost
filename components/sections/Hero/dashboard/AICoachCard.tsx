"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTypewriter } from "@/hooks/useTypewriter";
import { coachMessages } from "./data";

/** Floating AI Growth-Coach card — types a rotating insight, then offers an action. */
export default function AICoachCard({ live }: { live: boolean }) {
  const { text, done } = useTypewriter(coachMessages, { active: live, loop: true, startDelay: 1400, speed: 24, holdMs: 3400 });

  return (
    <div
      className="w-[248px] rounded-2xl border border-white/[0.1] p-4 backdrop-blur-xl"
      style={{ background: "rgba(10,12,18,0.82)", boxShadow: "0 24px 60px -20px rgba(34,211,238,0.25)" }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg [background:linear-gradient(120deg,#22d3ee,#34d399)]">
          <Sparkles size={12} className="text-black/80" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/45">AI Growth Coach</span>
      </div>
      <p className="min-h-[52px] text-[11.5px] leading-relaxed text-white/70">
        {text}
        {!done && <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-aurora-cyan align-middle" />}
      </p>
      <motion.button
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-aurora-teal/30 bg-aurora-teal/10 px-3 py-1.5 text-[10px] font-medium text-aurora-teal"
        initial={{ opacity: 0, y: 6 }}
        animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.4 }}
      >
        Schedule it →
      </motion.button>
    </div>
  );
}
