import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { PlatformId } from "@/config/platforms";
import type { ScheduledEvent } from "@/types/schedule";
import { listAllPosts } from "@/lib/db/posts";
import { listEvents } from "@/lib/db/schedule";
import { countAiUsage } from "@/lib/db/ai";
import { awardXp, getTotalXp, listXpEvents } from "@/lib/db/xp";
import { buildCreatorStats, type RawGrowthInputs } from "@/lib/growth/stats";
import { computeScoreBreakdown, weightedTotal, gradeFor } from "@/lib/growth/score";
import { levelInfoFor, todayKey } from "@/lib/growth/xp";
import { checkNewAchievements, type AchievementDef } from "@/lib/growth/achievements";
import { currentValueFor, isGoalMet } from "@/lib/growth/goals";
import { generateRecommendations } from "@/lib/growth/recommendations";
import { simulatePlatformSeries, dateRange } from "@/lib/growth/simulate";
import type {
  AnalyticsDay, CreatorScoreRow, XpEvent, UnlockedAchievement,
  Goal, GoalInput, GoalStatus, CreatorStats, GrowthRecommendation, RecommendationStatus,
} from "@/types/growth";

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "23505";

/* ── Analytics ── */
const ANALYTICS_COLS =
  "id,user_id,platform,date,followers,reach,impressions,views,watch_time_min,profile_visits,likes,comments,shares,saves,posts_published,created_at";

export async function listAnalytics(days = 60): Promise<AnalyticsDay[]> {
  const supabase = createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("analytics_daily").select(ANALYTICS_COLS).gte("date", since).order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AnalyticsDay[];
}

/** Seed (or extend forward to today) simulated analytics for platforms the user actually uses. */
async function ensureAnalyticsSeeded(platforms: PlatformId[], publishDatesByPlatform: Map<PlatformId, Set<string>>): Promise<void> {
  if (platforms.length === 0) return;
  const supabase = createClient();
  const userId = await uid();
  const todayStr = todayKey();

  const rows: Record<string, unknown>[] = [];
  for (const platform of platforms) {
    const { data: latest, error } = await supabase
      .from("analytics_daily")
      .select("date,followers")
      .eq("platform", platform)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    const last = latest as { date: string; followers: number } | null;
    if (last?.date === todayStr) continue; // already up to date

    const from = last ? new Date(new Date(`${last.date}T00:00:00Z`).getTime() + 86_400_000) : new Date(Date.now() - 89 * 86_400_000);
    const dates = dateRange(from, new Date());
    if (dates.length === 0) continue;

    const series = simulatePlatformSeries(userId, platform, dates, publishDatesByPlatform.get(platform) ?? new Set(), last?.followers);
    rows.push(...series.map((d) => ({ user_id: userId, ...d })));
  }
  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from("analytics_daily").upsert(rows, { onConflict: "user_id,platform,date" });
  if (insErr) throw insErr;
}

export async function seedAnalyticsForPlatform(platform: PlatformId): Promise<void> {
  await ensureAnalyticsSeeded([platform], new Map());
}

/* ── Creator Score ── */
const SCORE_COLS =
  "id,user_id,score,grade,consistency,frequency,engagement,platform_activity,growth,ai_utilization,content_quality,computed_at,created_at";

export async function listScoreHistory(limit = 30): Promise<CreatorScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("creator_scores").select(SCORE_COLS).order("computed_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CreatorScoreRow[];
}

/** Insert a new score snapshot at most once per calendar day. Returns the latest row either way. */
async function recomputeScoreIfStale(stats: CreatorStats): Promise<CreatorScoreRow> {
  const supabase = createClient();
  const userId = await uid();
  const { data: latest, error } = await supabase.from("creator_scores").select(SCORE_COLS).order("computed_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  const latestRow = latest as unknown as CreatorScoreRow | null;
  if (latestRow && latestRow.computed_at.slice(0, 10) === todayKey()) return latestRow;

  const breakdown = computeScoreBreakdown(stats);
  const score = weightedTotal(breakdown);
  const { data, error: insErr } = await supabase
    .from("creator_scores")
    .insert({ user_id: userId, score, grade: gradeFor(score), ...breakdown })
    .select(SCORE_COLS)
    .single();
  if (insErr) throw insErr;
  return data as unknown as CreatorScoreRow;
}

/** Once-per-day activity XP — call on any growth-page load. Idempotent via the day key. */
async function ensureDailyActivityXp(stats: CreatorStats): Promise<void> {
  if (stats.postsLast7d === 0 && stats.currentStreak === 0) return; // nothing to reward today
  await awardXp("daily_activity", todayKey());
}

/* ── Achievements ── */
export async function listUnlockedAchievements(): Promise<UnlockedAchievement[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("achievements").select("id,user_id,achievement_id,unlocked_at,created_at").order("unlocked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as UnlockedAchievement[];
}

async function syncAchievements(stats: CreatorStats, unlocked: UnlockedAchievement[]): Promise<AchievementDef[]> {
  const supabase = createClient();
  const userId = await uid();
  const newly = checkNewAchievements(stats, unlocked.map((u) => u.achievement_id));
  if (newly.length === 0) return [];

  const { error } = await supabase.from("achievements").insert(newly.map((a) => ({ user_id: userId, achievement_id: a.id })));
  if (error && !isUniqueViolation(error)) throw error;
  await Promise.all(newly.map((a) => awardXp("achievement_unlocked", `achievement:${a.id}`, { achievementId: a.id })));
  return newly;
}

/* ── Goals ── */
const GOAL_COLS = "id,user_id,metric,platform,target,current,status,starts_at,ends_at,created_at,updated_at";

export async function listGoals(): Promise<Goal[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("goals").select(GOAL_COLS).order("status", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Goal[];
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: await uid(), metric: input.metric, platform: input.platform ?? null, target: input.target, ends_at: input.endsAt ?? null })
    .select(GOAL_COLS)
    .single();
  if (error) throw error;
  return data as unknown as Goal;
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("goals").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

/** Recompute `current` for every active goal; mark newly-met ones completed + award XP. */
async function recomputeGoalsProgress(stats: CreatorStats, goals: Goal[]): Promise<Goal[]> {
  const supabase = createClient();
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) return goals;

  const updates = active.map((g) => {
    const current = currentValueFor(g.metric, stats);
    const completed = isGoalMet(current, g.target);
    return { ...g, current, status: (completed ? "completed" : "active") as GoalStatus };
  });

  await Promise.all(
    updates.map((g) => supabase.from("goals").update({ current: g.current, status: g.status }).eq("id", g.id)),
  );

  const newlyCompleted = updates.filter((g, i) => g.status === "completed" && active[i].status !== "completed");
  await Promise.all(newlyCompleted.map((g) => awardXp("goal_completed", `goal:${g.id}`, { goalId: g.id })));

  const byId = new Map(updates.map((g) => [g.id, g]));
  return goals.map((g) => byId.get(g.id) ?? g);
}

/* ── Growth recommendations ── */
const REC_COLS = "id,user_id,kind,title,description,action_label,action_href,severity,source,status,created_at,updated_at";

export async function listRecommendations(): Promise<GrowthRecommendation[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("growth_recommendations").select(REC_COLS).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as GrowthRecommendation[];
}

export async function setRecommendationStatus(id: string, status: RecommendationStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("growth_recommendations").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Run the rule engine; upsert active-per-kind rows; auto-complete ones that no longer apply. */
async function refreshRecommendations(stats: CreatorStats, goals: Goal[], existing: GrowthRecommendation[]): Promise<void> {
  const supabase = createClient();
  const userId = await uid();
  const candidates = generateRecommendations(stats, goals);
  const activeByKind = new Map(existing.filter((r) => r.status === "active").map((r) => [r.kind, r]));
  const firingKinds = new Set(candidates.map((c) => c.kind));

  for (const c of candidates) {
    const current = activeByKind.get(c.kind);
    if (!current) {
      const { error } = await supabase.from("growth_recommendations").insert({ user_id: userId, ...c });
      if (error && !isUniqueViolation(error)) throw error;
    } else if (current.title !== c.title || current.description !== c.description) {
      const { error } = await supabase
        .from("growth_recommendations")
        .update({ title: c.title, description: c.description, severity: c.severity, action_label: c.action_label, action_href: c.action_href })
        .eq("id", current.id);
      if (error) throw error;
    }
  }

  const resolved = Array.from(activeByKind.entries()).filter(([kind]) => !firingKinds.has(kind));
  await Promise.all(resolved.map(([, r]) => supabase.from("growth_recommendations").update({ status: "completed" }).eq("id", r.id)));
}

/* ── Orchestration ── */
export interface GrowthBundle {
  stats: CreatorStats;
  score: CreatorScoreRow;
  scoreHistory: CreatorScoreRow[];
  totalXp: number;
  level: ReturnType<typeof levelInfoFor>;
  xpHistory: XpEvent[];
  unlockedAchievements: UnlockedAchievement[];
  newlyUnlocked: AchievementDef[];
  goals: Goal[];
  recommendations: GrowthRecommendation[];
  /** Raw building blocks — exposed so pages can build charts without re-fetching. */
  analytics: AnalyticsDay[];
  scheduled: ScheduledEvent[];
}

async function buildStats(): Promise<{ stats: CreatorStats; goals: Goal[]; analytics: AnalyticsDay[]; scheduled: ScheduledEvent[] }> {
  const [posts, scheduled, aiUsage, goals] = await Promise.all([listAllPosts(), listEvents(), countAiUsage(), listGoals()]);

  const platforms = Array.from(new Set<PlatformId>([...posts.flatMap((p) => p.platforms), ...scheduled.map((s) => s.platform)]));
  const publishDatesByPlatform = new Map<PlatformId, Set<string>>();
  for (const s of scheduled) {
    if (s.status !== "published" || !s.published_at) continue;
    const set = publishDatesByPlatform.get(s.platform) ?? new Set<string>();
    set.add(s.published_at.slice(0, 10));
    publishDatesByPlatform.set(s.platform, set);
  }
  await ensureAnalyticsSeeded(platforms, publishDatesByPlatform);
  const analytics = await listAnalytics(90);

  const raw: RawGrowthInputs = {
    posts,
    scheduled,
    analytics,
    aiGenerationsCount: aiUsage.generations,
    aiConversationsCount: aiUsage.conversations,
    aiMessagesCount: aiUsage.messages,
    goalsCompletedCount: goals.filter((g) => g.status === "completed").length,
  };
  return { stats: buildCreatorStats(raw), goals, analytics, scheduled };
}

/**
 * The single entrypoint the analytics/score/coach pages call. Ensures analytics
 * are seeded, computes/persists today's score, awards real XP, unlocks
 * achievements, recomputes goal progress, and refreshes the recommendation feed
 * — then returns everything a page needs to render. Safe to call on every load.
 */
export async function syncGrowth(): Promise<GrowthBundle> {
  const { stats, goals, analytics, scheduled } = await buildStats();

  const [score, scoreHistory, unlockedAchievements, existingRecs] = await Promise.all([
    recomputeScoreIfStale(stats),
    listScoreHistory(),
    listUnlockedAchievements(),
    listRecommendations(),
  ]);

  await ensureDailyActivityXp(stats);
  const newlyUnlocked = await syncAchievements(stats, unlockedAchievements);
  const updatedGoals = await recomputeGoalsProgress(stats, goals);
  await refreshRecommendations(stats, updatedGoals, existingRecs);

  const [totalXp, xpHistory, recommendations, finalUnlocked] = await Promise.all([
    getTotalXp(),
    listXpEvents(),
    listRecommendations(),
    newlyUnlocked.length > 0 ? listUnlockedAchievements() : Promise.resolve(unlockedAchievements),
  ]);

  return {
    stats,
    score,
    scoreHistory,
    totalXp,
    level: levelInfoFor(totalXp),
    xpHistory,
    unlockedAchievements: finalUnlocked,
    newlyUnlocked,
    goals: updatedGoals,
    recommendations,
    analytics,
    scheduled,
  };
}
