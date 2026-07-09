import { Lock } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { AchievementDef } from "@/lib/growth/achievements";

/** AchievementCard — locked/unlocked badge tile. */
export default function AchievementCard({ def, unlockedAt }: { def: AchievementDef; unlockedAt?: string }) {
  const unlocked = !!unlockedAt;
  const Icon = def.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-300",
        unlocked ? "border-aurora-yellow/25 bg-aurora-yellow/[0.05]" : "border-white/[0.06] bg-white/[0.015] opacity-60",
      )}
    >
      <span
        className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", unlocked ? "[background:linear-gradient(120deg,#facc15,#fb923c)]" : "bg-white/[0.05]")}
      >
        {unlocked ? <Icon size={20} className="text-black/80" /> : <Lock size={16} className="text-white/25" />}
      </span>
      <div>
        <p className={cn("text-[13px] font-semibold", unlocked ? "text-white" : "text-white/50")}>{def.title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/35">{def.description}</p>
      </div>
      {unlocked && <span className="font-mono text-[10px] text-aurora-yellow/70">{timeAgo(unlockedAt)}</span>}
    </div>
  );
}
