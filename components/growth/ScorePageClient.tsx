"use client";

import { useState } from "react";
import { Plus, X, Loader2, Target, Flame } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { platforms, type PlatformId } from "@/config/platforms";
import { ACHIEVEMENTS } from "@/lib/growth/achievements";
import { GOAL_METRIC_LABELS } from "@/lib/growth/goals";
import type { CreatorScoreRow, LevelInfo, UnlockedAchievement, Goal, GoalMetric, CreatorStats } from "@/types/growth";
import { createGoalAction, archiveGoalAction, deleteGoalAction } from "@/app/(app)/growth/actions";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import EmptyState from "@/components/dashboard/EmptyState";
import CreatorScoreCard from "./CreatorScoreCard";
import XPBar from "./XPBar";
import AchievementCard from "./AchievementCard";
import GoalCard from "./GoalCard";

const METRICS: GoalMetric[] = ["followers", "reach", "posts", "engagement", "revenue"];

export default function ScorePageClient({
  score,
  scoreHistory,
  level,
  stats,
  unlockedAchievements,
  goals: initialGoals,
}: {
  score: CreatorScoreRow;
  scoreHistory: CreatorScoreRow[];
  level: LevelInfo;
  stats: CreatorStats;
  unlockedAchievements: UnlockedAchievement[];
  goals: Goal[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unlockedMap = new Map(unlockedAchievements.map((u) => [u.achievement_id, u.unlocked_at]));
  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "completed");

  async function archive(id: string) {
    setBusyId(id);
    setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, status: "archived" } : g)));
    await archiveGoalAction(id);
    setBusyId(null);
  }
  async function del(id: string) {
    setBusyId(id);
    setGoals((gs) => gs.filter((g) => g.id !== id));
    await deleteGoalAction(id);
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <CreatorScoreCard score={score} history={scoreHistory} />

      <WidgetContainer title="Level & XP">
        <XPBar level={level} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={Flame} label="Current streak" value={`${stats.currentStreak}d`} />
          <MiniStat icon={Flame} label="Longest streak" value={`${stats.longestStreak}d`} />
          <MiniStat icon={Target} label="Posts (30d)" value={formatNumber(stats.postsLast30d)} />
          <MiniStat icon={Target} label="Platforms active" value={String(stats.platformsUsed.length)} />
        </div>
      </WidgetContainer>

      <WidgetContainer title={`Achievements · ${unlockedAchievements.length}/${ACHIEVEMENTS.length}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENTS.map((def) => (
            <AchievementCard key={def.id} def={def} unlockedAt={unlockedMap.get(def.id)} />
          ))}
        </div>
      </WidgetContainer>

      <WidgetContainer title="Goals">
        <div className="-mt-2 mb-3 flex justify-end">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white">
            {open ? <X size={13} /> : <Plus size={13} />} {open ? "Cancel" : "New goal"}
          </button>
        </div>

        {open && (
          <GoalForm
            onCreated={(g) => {
              setGoals((gs) => [g, ...gs]);
              setOpen(false);
            }}
          />
        )}

        {activeGoals.length === 0 ? (
          <EmptyState compact icon={Target} title="No goals yet" description="Set a target for followers, reach, posts or engagement and track it automatically." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onArchive={archive} onDelete={del} busy={busyId === g.id} />
            ))}
          </div>
        )}
      </WidgetContainer>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
      <Icon size={13} className="mb-1.5 text-aurora-teal" />
      <div className="font-display text-base font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/35">{label}</div>
    </div>
  );
}

function GoalForm({ onCreated }: { onCreated: (g: Goal) => void }) {
  const [metric, setMetric] = useState<GoalMetric>("followers");
  const [platform, setPlatform] = useState<PlatformId | "">("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const num = Number(target);
    if (!num || num <= 0) return setError("Enter a target greater than 0.");
    setSaving(true);
    const res = await createGoalAction({ metric, platform: platform || undefined, target: num });
    setSaving(false);
    if ("error" in res) return setError(res.error);
    const now = new Date().toISOString();
    onCreated({ id: res.id, user_id: "", metric, platform: (platform || null) as PlatformId | null, target: num, current: 0, status: "active", starts_at: now, ends_at: null, created_at: now, updated_at: now });
    setTarget("");
  }

  return (
    <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto]">
        <select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/40 [color-scheme:dark]">
          {METRICS.map((m) => (
            <option key={m} value={m} className="bg-bg-secondary">{GOAL_METRIC_LABELS[m]}</option>
          ))}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId | "")} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/40 [color-scheme:dark]">
          <option value="" className="bg-bg-secondary">All platforms</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id} className="bg-bg-secondary">{p.name}</option>
          ))}
        </select>
        <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min={1} placeholder="Target" className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-aurora-teal/40" />
        <button onClick={submit} disabled={saving} className={cn("flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-50 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]")}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Create"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
