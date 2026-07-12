import { createAdminClient } from "@/lib/supabase/admin";
import { listAllPosts } from "@/lib/db/posts";
import { listGenerations } from "@/lib/db/ai";
import { generateText } from "@/lib/ai/gemini";
import type { PlatformId } from "@/config/platforms";

/**
 * Memory Service — inferred creator preferences, never a form a user fills
 * out (no new UI this sprint). Cheap heuristics (platform mix, emoji/hashtag
 * density — plain regex over real content, no network call) update on every
 * call; the qualitative fields (tone, writing style, CTA style, brand voice)
 * genuinely need semantic judgment a regex can't give, so those refresh via
 * one small, infrequent AI call instead of guessing — bounded to roughly
 * every 15 samples so this stays cheap in aggregate ("minimize token usage").
 */

const RESTYLE_EVERY_N_SAMPLES = 15;

export interface CreatorMemory {
  preferredTone: string | null;
  writingStyle: string | null;
  favoritePlatforms: PlatformId[];
  ctaStyle: string | null;
  emojiUsage: "frequent" | "occasional" | "rare" | null;
  hashtagStyle: "heavy" | "moderate" | "minimal" | "none" | null;
  contentCategories: string[];
  brandVoice: string | null;
  sampleCount: number;
}

interface MemoryRow {
  preferred_tone: string | null;
  writing_style: string | null;
  favorite_platforms: string[];
  cta_style: string | null;
  emoji_usage: string | null;
  hashtag_style: string | null;
  content_categories: string[];
  brand_voice: string | null;
  sample_count: number;
}

function rowToMemory(row: MemoryRow): CreatorMemory {
  return {
    preferredTone: row.preferred_tone,
    writingStyle: row.writing_style,
    favoritePlatforms: (row.favorite_platforms ?? []) as PlatformId[],
    ctaStyle: row.cta_style,
    emojiUsage: row.emoji_usage as CreatorMemory["emojiUsage"],
    hashtagStyle: row.hashtag_style as CreatorMemory["hashtagStyle"],
    contentCategories: row.content_categories ?? [],
    brandVoice: row.brand_voice,
    sampleCount: row.sample_count,
  };
}

export async function getMemory(userId: string): Promise<CreatorMemory | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_memory").select("preferred_tone,writing_style,favorite_platforms,cta_style,emoji_usage,hashtag_style,content_categories,brand_voice,sample_count").eq("user_id", userId).maybeSingle();
  return data ? rowToMemory(data as MemoryRow) : null;
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const HASHTAG_RE = /#\w+/g;
const CTA_PATTERNS: [RegExp, string][] = [
  [/link in bio/i, "link in bio"],
  [/comment (below|down)/i, "ask for comments"],
  [/subscribe/i, "subscribe/follow prompts"],
  [/follow (for|us)/i, "subscribe/follow prompts"],
  [/(save|bookmark) this/i, "save/bookmark prompts"],
  [/share (this|with)/i, "share prompts"],
  [/(dm|message) (me|us)/i, "direct-message prompts"],
];

function classifyDensity(countsPerPost: number[], thresholds: [number, number]): "frequent" | "occasional" | "rare" | null {
  if (countsPerPost.length === 0) return null;
  const avg = countsPerPost.reduce((s, n) => s + n, 0) / countsPerPost.length;
  if (avg >= thresholds[1]) return "frequent";
  if (avg >= thresholds[0]) return "occasional";
  return "rare";
}

/**
 * Best-effort — called opportunistically after a successful AI action/chat
 * turn. Cheap heuristics always refresh; the LLM-based style pass only
 * fires once every `RESTYLE_EVERY_N_SAMPLES` calls. Never throws — a
 * failure here shouldn't surface to whatever just successfully generated
 * content for the user.
 */
export async function inferAndUpdateMemory(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const [posts, generations, existing] = await Promise.all([
      listAllPosts(),
      listGenerations(),
      admin.from("ai_memory").select("sample_count").eq("user_id", userId).maybeSingle(),
    ]);

    const recentPosts = posts.filter((p) => p.content.trim()).slice(0, 20);
    if (recentPosts.length === 0) return;

    const platformCounts = new Map<PlatformId, number>();
    for (const p of recentPosts) for (const platform of p.platforms) platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
    const favoritePlatforms = Array.from(platformCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p);

    const emojiCounts = recentPosts.map((p) => (p.content.match(EMOJI_RE) ?? []).length);
    const hashtagCounts = recentPosts.map((p) => (p.content.match(HASHTAG_RE) ?? []).length);
    const emojiUsage = classifyDensity(emojiCounts, [1, 4]);
    const hashtagStyle: CreatorMemory["hashtagStyle"] = (() => {
      if (hashtagCounts.length === 0) return null;
      const avg = hashtagCounts.reduce((s, n) => s + n, 0) / hashtagCounts.length;
      if (avg === 0) return "none";
      if (avg >= 8) return "heavy";
      if (avg >= 3) return "moderate";
      return "minimal";
    })();

    const ctaHits = new Map<string, number>();
    for (const p of recentPosts) for (const [re, label] of CTA_PATTERNS) if (re.test(p.content)) ctaHits.set(label, (ctaHits.get(label) ?? 0) + 1);
    const ctaStyle = Array.from(ctaHits.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const priorSampleCount = (existing.data as { sample_count: number } | null)?.sample_count ?? 0;
    const sampleCount = priorSampleCount + 1;

    const patch: Record<string, unknown> = {
      user_id: userId,
      favorite_platforms: favoritePlatforms,
      emoji_usage: emojiUsage,
      hashtag_style: hashtagStyle,
      cta_style: ctaStyle,
      sample_count: sampleCount,
      updated_at: new Date().toISOString(),
    };

    // Qualitative style — a real (small, infrequent) AI call, not a guess.
    if (priorSampleCount === 0 || sampleCount % RESTYLE_EVERY_N_SAMPLES === 0) {
      const sample = recentPosts.slice(0, 8).map((p) => p.content.slice(0, 300)).join("\n---\n");
      const askedTopics = generations.slice(0, 5).map((g) => (g.input as { topic?: string })?.topic).filter(Boolean);
      const topicsLine = askedTopics.length > 0 ? `\n\nThey've also recently asked AI to help write about: ${askedTopics.join(", ")}.` : "";
      try {
        const raw = await generateText({
          system: "You analyze a creator's own writing samples and return ONLY a compact JSON object describing their style. No prose, no markdown fences.",
          messages: [{
            role: "user",
            content: `Here are ${recentPosts.length > 8 ? "8 of " : ""}this creator's real posts:\n\n${sample}${topicsLine}\n\nReturn JSON exactly like: {"tone": "2-4 words", "writingStyle": "2-4 words", "brandVoice": "2-4 words", "contentCategories": ["topic1","topic2","topic3"]}`,
          }],
          temperature: 0.3,
          maxOutputTokens: 200,
        });
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned) as { tone?: string; writingStyle?: string; brandVoice?: string; contentCategories?: string[] };
        if (parsed.tone) patch.preferred_tone = parsed.tone;
        if (parsed.writingStyle) patch.writing_style = parsed.writingStyle;
        if (parsed.brandVoice) patch.brand_voice = parsed.brandVoice;
        if (Array.isArray(parsed.contentCategories)) patch.content_categories = parsed.contentCategories.slice(0, 5);
      } catch {
        /* style inference is a nice-to-have refinement, not required for the heuristic fields above to save */
      }
    }

    await admin.from("ai_memory").upsert(patch, { onConflict: "user_id" });
  } catch {
    /* best-effort — never blocks the AI response that triggered this */
  }
}
