/**
 * Mock data for the living hero dashboard. Kept out of the components so the
 * "product" surface reads as real and stays easy to tune.
 */
import type { PlatformId } from "@/config/platforms";

export const creator = { name: "Aarav", handle: "@aarav.builds", score: 84, level: 7, xp: 72, streak: 12 };

export const stats = [
  { key: "followers", label: "Followers", value: 128400, display: "128.4K", delta: "+3.2%", up: true, accent: "#22d3ee" },
  { key: "reach", label: "Reach", value: 512000, display: "512K", delta: "+11.4%", up: true, accent: "#34d399" },
  { key: "engagement", label: "Engagement", value: 6.8, display: "6.8%", delta: "+0.6%", up: true, accent: "#facc15" },
];

/** Growth chart points (normalized 0–100, higher = better). */
export const growthSeries = [18, 24, 22, 31, 38, 35, 46, 52, 49, 61, 68, 74, 82];

export const connectedPlatforms: PlatformId[] = ["instagram", "youtube", "linkedin", "x", "facebook", "threads"];

export const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
/** posts scheduled per weekday; todayIndex is highlighted. */
export const calendar = [2, 1, 3, 0, 2, 4, 1];
export const todayIndex = 2;

export const schedule = [
  { time: "11:00", platform: "instagram" as PlatformId, title: "Reel · Behind the build", status: "scheduled" },
  { time: "14:30", platform: "linkedin" as PlatformId, title: "Carousel · 5 growth lessons", status: "scheduled" },
  { time: "18:00", platform: "youtube" as PlatformId, title: "Short · Studio tour", status: "draft" },
];

export const coachMessages = [
  "Post your reel at 7 PM today — your audience is 34% more active then. Want me to schedule it?",
  "Your carousels get 2.1× more saves than reels. Try one more this week.",
  "You're on a 12-day streak. One post today keeps it alive 🔥",
];

export const notifications = [
  { emoji: "🎉", text: "Your reel crossed 10K views" },
  { emoji: "📈", text: "Reach up 11% this week" },
  { emoji: "✨", text: "AI drafted 3 new post ideas" },
  { emoji: "🔥", text: "New follower milestone: 128K" },
];
