import type { PlatformId } from "@/config/platforms";

/* ── Analytics ── */
export interface AnalyticsDay {
  id: string;
  user_id: string;
  platform: PlatformId;
  /** YYYY-MM-DD */
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  views: number;
  watch_time_min: number;
  profile_visits: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  posts_published: number;
  created_at: string;
}

/* ── Per-post metrics (Integration Sprint 4 — real provider sync) ── */
export interface PostAnalytics {
  id: string;
  user_id: string;
  scheduled_post_id: string;
  platform: PlatformId;
  platform_post_id: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  clicks: number;
  engagement_rate: number;
  raw: Record<string, unknown>;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

/* ── Creator Score ── */
export interface ScoreBreakdown {
  consistency: number;
  frequency: number;
  engagement: number;
  platform_activity: number;
  growth: number;
  ai_utilization: number;
  content_quality: number;
}

export interface CreatorScoreRow extends ScoreBreakdown {
  id: string;
  user_id: string;
  score: number;
  grade: string;
  computed_at: string;
  created_at: string;
}

/* ── XP ── */
export interface XpEvent {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  /** XP earned since the start of the current level. */
  xpIntoLevel: number;
  /** XP needed to reach the next level. */
  xpForNextLevel: number;
  progress: number; // 0..1
}

/* ── Achievements ── */
export interface UnlockedAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  created_at: string;
}

/* ── Goals ── */
export type GoalMetric = "followers" | "reach" | "posts" | "engagement" | "revenue";
export type GoalStatus = "active" | "completed" | "failed" | "archived";

export interface Goal {
  id: string;
  user_id: string;
  metric: GoalMetric;
  platform: PlatformId | null;
  target: number;
  current: number;
  status: GoalStatus;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalInput {
  metric: GoalMetric;
  platform?: PlatformId | null;
  target: number;
  endsAt?: string | null;
}

/* ── Growth recommendations (AI Growth Coach) ── */
export type RecommendationKind =
  | "timing" | "consistency" | "format" | "platform" | "engagement_drop"
  | "streak_risk" | "ai_usage" | "growth_win" | "goal_progress"
  | "content_gap" | "audience_strategy" | "posting_frequency" | "platform_opportunity";
export type RecommendationSeverity = "info" | "success" | "warning" | "danger";
export type RecommendationStatus = "active" | "dismissed" | "completed";

export interface GrowthRecommendation {
  id: string;
  user_id: string;
  kind: RecommendationKind;
  title: string;
  description: string;
  action_label: string | null;
  action_href: string | null;
  severity: RecommendationSeverity;
  source: "rule" | "ai";
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

/* ── Weekly Growth Coach reviews (Integration Sprint 5) ── */
export interface GrowthReport {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  summary: string;
  highlights: string[];
  daily_tasks: string[];
  generated_at: string;
  created_at: string;
}

/* ── Aggregated stats bundle used by score/xp/achievements/recommendations ── */
export interface CreatorStats {
  totalPosts: number;
  publishedPosts: number;
  postsLast30d: number;
  postsLast7d: number;
  activeDaysLast30d: number;
  currentStreak: number;
  longestStreak: number;
  platformsUsed: PlatformId[];
  aiGenerations: number;
  aiConversations: number;
  aiMessages: number;
  scheduledUpcoming: number;
  failedSchedules: number;
  goalsCompleted: number;
  /** Latest per-platform totals from analytics_daily. */
  latestFollowers: number;
  latestReachLast30d: number;
  engagementRate: number; // 0..1
  followerGrowthPct30d: number; // can be negative
  bestPlatform: PlatformId | null;
  bestPostingHour: number | null;
  mediaAttachRate: number; // 0..1
  withinLimitRate: number; // 0..1
}
