import type { PlatformId } from "@/config/platforms";
import type { PostMedia } from "@/types/post";

/** Schedule-level status (the per-channel publishing lifecycle). */
export type ScheduleStatus = "scheduled" | "queued" | "publishing" | "published" | "failed" | "canceled";

/** The full content lifecycle, spanning post-level + schedule-level states. */
export type LifecycleStatus = "draft" | ScheduleStatus | "archived";

/** A row of `public.scheduled_posts` — one per (post × platform). */
export interface ScheduledPost {
  id: string;
  user_id: string;
  post_id: string;
  platform: PlatformId;
  /** Absolute instant (UTC ISO). */
  scheduled_time: string;
  /** IANA zone the user picked when scheduling (display metadata). */
  timezone: string;
  duration_min: number;
  status: ScheduleStatus;
  priority: boolean;
  position: number;
  retry_count: number;
  max_retries: number;
  error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The bits of the parent post we join in for display + publishing adapters. */
export interface SchedulePostRef {
  id: string;
  title: string;
  content: string;
  media: PostMedia[];
}

/** A scheduled post joined with its parent post (calendar/queue rendering). */
export interface ScheduledEvent extends ScheduledPost {
  post: SchedulePostRef | null;
}

export interface PublishingLog {
  id: string;
  user_id: string;
  scheduled_post_id: string;
  post_id: string | null;
  platform: PlatformId;
  status: string;
  message: string | null;
  created_at: string;
}

export type CalendarView = "month" | "week" | "day" | "agenda";

/** Input for creating a schedule (one post, one or more platforms, one time). */
export interface ScheduleInput {
  postId: string;
  platforms: PlatformId[];
  /** Absolute instant (UTC ISO) computed from the chosen wall-time + timezone. */
  scheduledTime: string;
  timezone: string;
  priority?: boolean;
  durationMin?: number;
}

/** Future-ready recurrence (defined now, executed by a later worker sprint). */
export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  /** 0–6 (Sun–Sat) for weekly. */
  daysOfWeek?: number[];
  count?: number;
  until?: string;
}
