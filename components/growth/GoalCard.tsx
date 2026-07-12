"use client";

import { Target, Trash2, Archive, CheckCircle2 } from "lucide-react";
import { getPlatform } from "@/config/platforms";
import { cn, formatNumber } from "@/lib/utils";
import { GOAL_METRIC_LABELS, GOAL_METRIC_UNITS, goalProgress } from "@/lib/growth/goals";
import { forecastGoal } from "@/lib/ai/forecast";
import type { Goal } from "@/types/growth";

export default function GoalCard({ goal, onArchive, onDelete, busy = false }: { goal: Goal; onArchive: (id: string) => void; onDelete: (id: string) => void; busy?: boolean }) {
  const progress = goalProgress(goal.current, goal.target);
  const p = goal.platform ? getPlatform(goal.platform) : null;
  const unit = GOAL_METRIC_UNITS[goal.metric];
  const daysLeft = goal.ends_at ? Math.ceil((new Date(goal.ends_at).getTime() - Date.now()) / 86_400_000) : null;
  const forecast = goal.status === "active" ? forecastGoal(goal) : null;

  return (
    <div className={cn("rounded-2xl border p-4", goal.status === "completed" ? "border-aurora-green/25 bg-aurora-green/[0.04]" : "border-white/[0.07] bg-white/[0.02]")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-aurora-teal/12">
            {goal.status === "completed" ? <CheckCircle2 size={14} className="text-aurora-green" /> : <Target size={14} className="text-aurora-teal" />}
          </span>
          <span className="text-sm font-semibold text-white">{GOAL_METRIC_LABELS[goal.metric]}</span>
          {p && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: `${p.color}22`, color: p.color }}>{p.glyph}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onArchive(goal.id)} disabled={busy} aria-label="Archive goal" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-40">
            <Archive size={13} />
          </button>
          <button onClick={() => onDelete(goal.id)} disabled={busy} aria-label="Delete goal" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
        <span className="font-mono text-white/80">
          {unit === "₹" ? "₹" : ""}{formatNumber(goal.current)}{unit !== "₹" ? unit : ""} <span className="text-white/30">/ {unit === "₹" ? "₹" : ""}{formatNumber(goal.target)}{unit !== "₹" ? unit : ""}</span>
        </span>
        <span className="font-mono text-[11px] text-aurora-teal">{Math.round(progress * 100)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", goal.status === "completed" ? "bg-aurora-green" : "[background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)]")}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {daysLeft != null && goal.status === "active" && (
        <p className="mt-2 text-[11px] text-white/30">{daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Deadline passed"}</p>
      )}
      {forecast && (
        <p className={cn("mt-1 text-[11px]", forecast.onTrack ? "text-white/30" : "text-amber-300/70")}>
          {forecast.estimatedCompletionDate ? `Est. completion at current pace: ${forecast.estimatedCompletionDate}` : "Not on pace at the current rate"}
        </p>
      )}
      {goal.status === "completed" && <p className="mt-2 text-[11px] font-medium text-aurora-green">Goal reached 🎉</p>}
    </div>
  );
}
