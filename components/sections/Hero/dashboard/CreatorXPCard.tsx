"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { creator } from "./data";

/** Floating gamification card — creator level, XP progress, and streak. */
export default function CreatorXPCard({ live }: { live: boolean }) {
  const xp = useCountUp(creator.xp, { active: live, duration: 1600 });

  return (
    <div
      className="w-[210px] rounded-2xl border border-white/[0.1] p-4 backdrop-blur-xl"
      style={{ background: "rgba(10,12,18,0.82)", boxShadow: "0 24px 60px -20px rgba(250,204,21,0.2)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-display text-sm font-bold text-white">Level {creator.level}</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-white/35">Creator</div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-1 text-[10px] font-medium text-orange-400">
          <Flame size={11} /> {creator.streak}d
        </span>
      </div>
      <div className="mb-1 flex items-center justify-between text-[9px] text-white/40">
        <span>XP</span>
        <span className="tabular-nums">{Math.round(xp)} / 100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full [background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)]"
          initial={{ width: 0 }}
          animate={live ? { width: `${creator.xp}%` } : {}}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
