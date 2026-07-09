import type { PlatformId } from "@/config/platforms";
import { zonedWallTimeToUtcIso } from "./timezone";
import { addDays, toDateInputValue, toTimeInputValue } from "./calendar";

/** A post must be scheduled at least this far in the future. */
export const MIN_LEAD_MS = 60_000; // 1 minute
/** Soft cap on active (scheduled/queued) items per platform queue. */
export const QUEUE_LIMIT_PER_PLATFORM = 50;

/**
 * Suggested best posting times per platform (local wall-clock "HH:MM"), used to
 * prefill the scheduler. Static heuristics now; analytics-driven later.
 */
export const BEST_TIMES: Record<PlatformId, string[]> = {
  instagram: ["11:00", "13:00", "19:00"],
  youtube: ["15:00", "18:00", "20:00"],
  linkedin: ["08:00", "10:00", "12:00"],
  x: ["09:00", "12:00", "17:00"],
  facebook: ["10:00", "13:00", "19:00"],
  threads: ["11:00", "18:00", "21:00"],
};

/** Default schedule slot: tomorrow at 9:00am local. */
export function defaultSlot(now = new Date()): { date: string; time: string } {
  const d = addDays(now, 1);
  return { date: toDateInputValue(d), time: "09:00" };
}

/** Suggested time for a platform (first best-time), else 9am. */
export function suggestedTime(platform?: PlatformId): string {
  if (platform && BEST_TIMES[platform]) return BEST_TIMES[platform][0];
  return "09:00";
}

/** Validate a chosen wall-time in a zone. Returns an error string or null. */
export function validateScheduleTime(dateStr: string, timeStr: string, tz: string, now = Date.now()): string | null {
  if (!dateStr || !timeStr) return "Pick a date and time.";
  const iso = zonedWallTimeToUtcIso(dateStr, timeStr, tz);
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "That date/time isn't valid.";
  if (t < now + MIN_LEAD_MS) return "Pick a time at least a minute in the future.";
  if (t > now + 365 * 2 * 86_400_000) return "That's too far ahead (max ~2 years).";
  return null;
}

/** Convenience: build the current default date/time input pair. */
export function defaultInputs(now = new Date()) {
  const { date, time } = defaultSlot(now);
  return { date, time, timePreview: toTimeInputValue(now) };
}
