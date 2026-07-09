import type { LevelInfo } from "@/types/growth";

/** XP awarded for real, verifiable actions. Amounts are small and additive. */
export const XP_AWARDS = {
  post_published: 25,
  post_scheduled_ahead: 5,
  ai_generation: 2,
  ai_conversation_started: 3,
  daily_activity: 10,
  goal_completed: 50,
  achievement_unlocked: 15,
} as const;

export type XpReason = keyof typeof XP_AWARDS;

/** Level thresholds grow ~20% per level (level 1 = 0 XP). */
const BASE = 100;
const GROWTH = 1.2;

function xpForLevel(level: number): number {
  // Total cumulative XP required to REACH this level.
  let total = 0;
  for (let l = 1; l < level; l++) total += Math.round(BASE * Math.pow(GROWTH, l - 1));
  return total;
}

/** Derive level + progress from a total XP figure. Pure — no storage of "level". */
export function levelInfoFor(totalXp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp && level < 100) level++;
  const floor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  const xpIntoLevel = totalXp - floor;
  const xpForNextLevel = nextFloor - floor;
  return {
    level,
    totalXp,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 1,
  };
}

/** Today's date key (UTC) — used as the idempotency key for once-per-day events. */
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
