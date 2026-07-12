import type { Goal } from "@/types/growth";
import { goalProgress } from "@/lib/growth/goals";

/**
 * Forecast Service — pure computation, no LLM. Projects goal completion
 * from a simple linear rate: progress made ÷ days since the goal was
 * created. Honest simplification, stated plainly rather than dressed up as
 * more rigorous than it is: this app doesn't store a historical
 * progress-over-time series per goal (`goals.current` is overwritten in
 * place on every `syncGrowth()` call, not appended to), so a real fitted
 * trend line isn't possible yet — a straight-line rate from creation to now
 * is the best available signal without a schema change this sprint doesn't
 * otherwise need.
 */

export interface GoalForecast {
  goalId: string;
  progressPct: number;
  dailyRate: number;
  onTrack: boolean;
  estimatedCompletionDate: string | null;
  daysRemaining: number | null;
}

export function forecastGoal(goal: Goal): GoalForecast {
  const progressPct = Math.round(goalProgress(goal.current, goal.target) * 100);
  const remaining = goal.target - goal.current;

  if (remaining <= 0) {
    return { goalId: goal.id, progressPct: 100, dailyRate: 0, onTrack: true, estimatedCompletionDate: null, daysRemaining: 0 };
  }

  const daysSinceStart = Math.max(1, (Date.now() - new Date(goal.starts_at).getTime()) / 86_400_000);
  const dailyRate = goal.current / daysSinceStart;

  if (dailyRate <= 0) {
    return { goalId: goal.id, progressPct, dailyRate: 0, onTrack: false, estimatedCompletionDate: null, daysRemaining: null };
  }

  const daysRemaining = Math.ceil(remaining / dailyRate);
  const estimatedCompletionDate = new Date(Date.now() + daysRemaining * 86_400_000).toISOString().slice(0, 10);
  const onTrack = !goal.ends_at || new Date(estimatedCompletionDate).getTime() <= new Date(goal.ends_at).getTime();

  return { goalId: goal.id, progressPct, dailyRate: Math.round(dailyRate * 100) / 100, onTrack, estimatedCompletionDate, daysRemaining };
}

export function forecastGoals(goals: Goal[]): GoalForecast[] {
  return goals.filter((g) => g.status === "active").map(forecastGoal);
}
