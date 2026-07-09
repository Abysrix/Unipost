import { Zap } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { LevelInfo } from "@/types/growth";

/** XPBar — level, progress toward next level, and total XP. */
export default function XPBar({ level, compact = false }: { level: LevelInfo; compact?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-aurora-teal/15">
            <Zap size={12} className="text-aurora-teal" />
          </span>
          <span className="font-display text-sm font-bold text-white">Level {level.level}</span>
        </div>
        {!compact && <span className="font-mono text-[11px] text-white/35">{formatNumber(level.totalXp)} XP total</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full [background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)] transition-[width] duration-700"
          style={{ width: `${Math.round(level.progress * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/30">
        <span>{formatNumber(level.xpIntoLevel)} XP</span>
        <span>{formatNumber(level.xpForNextLevel)} XP to Level {level.level + 1}</span>
      </div>
    </div>
  );
}
