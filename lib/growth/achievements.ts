import type { LucideIcon } from "lucide-react";
import { Rocket, Flame, Trophy, Sparkles, Layers, Target, CalendarCheck, Crown, Bot } from "lucide-react";
import type { CreatorStats } from "@/types/growth";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Pure predicate — true once the achievement's criteria are met. */
  criteria: (stats: CreatorStats) => boolean;
}

/** Static catalog — the source of truth for what achievements exist and how they unlock. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_post", title: "First Post", description: "Publish your first post", icon: Rocket, criteria: (s) => s.publishedPosts >= 1 },
  { id: "streak_7", title: "7-Day Streak", description: "Stay active for 7 days in a row", icon: Flame, criteria: (s) => s.currentStreak >= 7 || s.longestStreak >= 7 },
  { id: "streak_30", title: "30-Day Streak", description: "Stay active for 30 days in a row", icon: Flame, criteria: (s) => s.currentStreak >= 30 || s.longestStreak >= 30 },
  { id: "century_club", title: "Century Club", description: "Publish 100 posts", icon: Trophy, criteria: (s) => s.publishedPosts >= 100 },
  { id: "ai_power_user", title: "AI Power User", description: "Use UniPost AI 50 times", icon: Sparkles, criteria: (s) => s.aiGenerations + s.aiMessages >= 50 },
  { id: "multi_platform", title: "Multi-Platform", description: "Post to 4 or more platforms", icon: Layers, criteria: (s) => s.platformsUsed.length >= 4 },
  { id: "goal_getter", title: "Goal Getter", description: "Complete your first goal", icon: Target, criteria: (s) => s.goalsCompleted >= 1 },
  { id: "early_bird", title: "Early Bird", description: "Have 5+ posts scheduled ahead of time", icon: CalendarCheck, criteria: (s) => s.scheduledUpcoming >= 5 },
  { id: "consistency_king", title: "Consistency King", description: "Active 25+ of the last 30 days", icon: Crown, criteria: (s) => s.activeDaysLast30d >= 25 },
  { id: "ai_conversationalist", title: "AI Conversationalist", description: "Start 10 AI conversations", icon: Bot, criteria: (s) => s.aiConversations >= 10 },
];

/** Achievements whose criteria are newly met given `stats`, excluding already-unlocked ids. */
export function checkNewAchievements(stats: CreatorStats, unlockedIds: string[]): AchievementDef[] {
  const unlocked = new Set(unlockedIds);
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.criteria(stats));
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
