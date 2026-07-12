import type { Post } from "@/types/post";
import type { ScheduledEvent } from "@/types/schedule";
import type { PostAnalytics } from "@/types/growth";
import { hourInZone } from "@/lib/schedule/timezone";

/**
 * Content Intelligence — pure computation over real posts/post_analytics,
 * no LLM call. "Best performing X" needs the *actual numbers*, which a
 * language model can't know on its own; this is the layer that computes
 * them, and the Growth Coach (lib/ai/growthCoach.ts) is the layer that
 * turns them into a written suggestion. Every function degrades to `null`/
 * empty rather than guessing when there isn't enough real data yet — a
 * "best format" computed from 2 posts isn't a finding.
 */

const MIN_SAMPLE = 3;

export interface FormatInsight {
  format: "image" | "video" | "carousel" | "text-only";
  avgEngagement: number;
  postCount: number;
}

export interface LengthInsight {
  bucket: "short" | "medium" | "long";
  avgEngagement: number;
  postCount: number;
}

export interface HourInsight {
  hour: number;
  avgEngagement: number;
  postCount: number;
}

export interface CtaInsight {
  style: string;
  avgEngagement: number;
  postCount: number;
}

export interface ContentInsights {
  bestFormat: FormatInsight | null;
  bestLength: LengthInsight | null;
  bestHour: HourInsight | null;
  bestCta: CtaInsight | null;
  worstPosts: { title: string; platform: string; engagement: number }[];
  sampleSize: number;
}

export interface JoinedPost {
  post: Post;
  event: ScheduledEvent;
  metrics: PostAnalytics;
}

function engagementOf(m: PostAnalytics): number {
  return m.likes + m.comments + m.shares + m.saves;
}

function formatOf(post: Post): FormatInsight["format"] {
  if (post.media.length === 0) return "text-only";
  if (post.media.length > 1) return "carousel";
  return post.media[0].type === "video" ? "video" : "image";
}

function lengthBucketOf(post: Post): LengthInsight["bucket"] {
  const len = post.content.length;
  if (len < 100) return "short";
  if (len < 400) return "medium";
  return "long";
}

const CTA_PATTERNS: [RegExp, string][] = [
  [/link in bio/i, "link in bio"],
  [/comment (below|down)/i, "ask for comments"],
  [/subscribe/i, "subscribe/follow prompts"],
  [/follow (for|us)/i, "subscribe/follow prompts"],
  [/(save|bookmark) this/i, "save/bookmark prompts"],
  [/share (this|with)/i, "share prompts"],
  [/(dm|message) (me|us)/i, "direct-message prompts"],
];

function ctaOf(post: Post): string | null {
  for (const [re, label] of CTA_PATTERNS) if (re.test(post.content)) return label;
  return null;
}

function averageBy<T extends string>(joined: JoinedPost[], keyOf: (j: JoinedPost) => T | null): Map<T, { total: number; count: number }> {
  const map = new Map<T, { total: number; count: number }>();
  for (const j of joined) {
    const key = keyOf(j);
    if (key === null) continue;
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += engagementOf(j.metrics);
    cur.count += 1;
    map.set(key, cur);
  }
  return map;
}

function bestOf<T extends string>(map: Map<T, { total: number; count: number }>): { key: T; avg: number; count: number } | null {
  let best: { key: T; avg: number; count: number } | null = null;
  for (const [key, { total, count }] of map) {
    if (count < MIN_SAMPLE) continue;
    const avg = total / count;
    if (!best || avg > best.avg) best = { key, avg: Math.round(avg), count };
  }
  return best;
}

/**
 * `joined` pairs each real per-post metric row with its parent post (for
 * format/length/CTA) and scheduled event (for posting hour + timezone).
 * Callers assemble this — the Context Service and Growth Coach both need
 * slightly different subsets of the same three tables, so the join itself
 * isn't duplicated here.
 */
export function computeContentInsights(joined: JoinedPost[]): ContentInsights {
  if (joined.length < MIN_SAMPLE) {
    return { bestFormat: null, bestLength: null, bestHour: null, bestCta: null, worstPosts: [], sampleSize: joined.length };
  }

  const byFormat = averageBy(joined, (j) => formatOf(j.post));
  const byLength = averageBy(joined, (j) => lengthBucketOf(j.post));
  const byCta = averageBy(joined, (j) => ctaOf(j.post));
  const byHour = averageBy(joined, (j) => String(hourInZone(j.event.scheduled_time, j.event.timezone)));

  const bestFormat = bestOf(byFormat);
  const bestLength = bestOf(byLength);
  const bestCta = bestOf(byCta);
  const bestHour = bestOf(byHour);

  const worst = [...joined].sort((a, b) => engagementOf(a.metrics) - engagementOf(b.metrics)).slice(0, 3);

  return {
    bestFormat: bestFormat ? { format: bestFormat.key, avgEngagement: bestFormat.avg, postCount: bestFormat.count } : null,
    bestLength: bestLength ? { bucket: bestLength.key, avgEngagement: bestLength.avg, postCount: bestLength.count } : null,
    bestHour: bestHour ? { hour: Number(bestHour.key), avgEngagement: bestHour.avg, postCount: bestHour.count } : null,
    bestCta: bestCta ? { style: bestCta.key, avgEngagement: bestCta.avg, postCount: bestCta.count } : null,
    worstPosts: worst.map((j) => ({ title: j.post.title.trim() || "Untitled post", platform: j.event.platform, engagement: engagementOf(j.metrics) })),
    sampleSize: joined.length,
  };
}
