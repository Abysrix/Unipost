/**
 * Mock dashboard data. Isolated here so widgets stay pure and every value can be
 * swapped for a real query in a later sprint without touching UI. NOT wired to APIs.
 */
import type { PlatformId } from "@/config/platforms";

export const summary = { streak: 12, scheduledToday: 3, drafts: 2, creatorScore: 84, level: 7, xp: 72 };

export const kpis = [
  { key: "followers", label: "Followers", value: "128.4K", delta: "3.2%", up: true },
  { key: "reach", label: "Reach (30d)", value: "512K", delta: "11%", up: true },
  { key: "engagement", label: "Engagement", value: "6.8%", delta: "0.6%", up: true },
];

export const analyticsSeries = [22, 28, 26, 34, 40, 38, 47, 55, 52, 63, 70, 76, 84, 92];

export const todaySchedule: { time: string; platform: PlatformId; title: string; status: "scheduled" | "draft" }[] = [
  { time: "11:00", platform: "instagram", title: "Reel · Behind the build", status: "scheduled" },
  { time: "14:30", platform: "linkedin", title: "Carousel · 5 growth lessons", status: "scheduled" },
  { time: "18:00", platform: "youtube", title: "Short · Studio tour", status: "draft" },
];

export const recentDrafts: { title: string; platform: PlatformId; edited: string }[] = [
  { title: "Thread · The creator stack I use daily", platform: "x", edited: "2h ago" },
  { title: "Reel · 3 hooks that always work", platform: "instagram", edited: "Yesterday" },
];

export const activity: { kind: "publish" | "schedule" | "milestone" | "ai"; text: string; time: string }[] = [
  { kind: "milestone", text: "You crossed 128K followers 🎉", time: "2h ago" },
  { kind: "publish", text: "“How I edit in 5 min” went live on YouTube", time: "6h ago" },
  { kind: "ai", text: "AI drafted 3 new post ideas for you", time: "9h ago" },
  { kind: "schedule", text: "Scheduled 4 posts for this week", time: "1d ago" },
];

export const aiTips = [
  "Post your reels between 6–8 PM — your audience is 34% more active then.",
  "Your carousels get 2.1× more saves than reels. Try one more this week.",
  "Reply to comments in the first hour to boost reach by ~18%.",
];
/** Deterministic tip-of-the-day (stable per calendar day). */
export const aiTipOfDay = aiTips[new Date().getDate() % aiTips.length];

export const credits = { used: 340, total: 1000 };
