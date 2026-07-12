import type { CreatorContext } from "@/lib/ai/context";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { getPlatform } from "@/config/platforms";

/**
 * Prompt Builder — the one place a `CreatorContext` becomes prompt text.
 * Every AI call site renders through here instead of hand-assembling its
 * own context paragraph, so "what does the model actually get told about
 * this creator" has one implementation, not four slightly-different ones.
 *
 * Deliberately natural language, not a JSON dump of the context object —
 * an LLM reasons over and writes in prose better than it "reads" structured
 * data verbatim, and prose is more token-efficient than pretty-printed JSON
 * for the same information. `sections` lets each call site include only
 * what it actually needs (a one-shot hashtag request doesn't need goals or
 * achievements) — direct answer to "minimize token usage."
 */

export interface ContextSections {
  performance?: boolean;
  score?: boolean;
  goals?: boolean;
  achievements?: boolean;
  style?: boolean;
  recentTopics?: boolean;
  topPosts?: boolean;
}

const ALL_SECTIONS: ContextSections = { performance: true, score: true, goals: true, achievements: true, style: true, recentTopics: true, topPosts: true };

export function buildContextSummary(context: CreatorContext | null, sections: ContextSections = ALL_SECTIONS): string {
  if (!context) return "";
  const lines: string[] = [];

  const platforms = context.connectedPlatforms.map((p) => getPlatform(p.platform)?.name ?? p.platform).join(", ");
  lines.push(`Creator: ${context.profile.displayName}, ${context.profile.plan} plan${platforms ? `, posts to ${platforms}` : ", no platforms connected yet"}.`);

  if (sections.performance && context.performance) {
    const perf = context.performance;
    const growth = perf.followerGrowthPct30d >= 0 ? `+${perf.followerGrowthPct30d}%` : `${perf.followerGrowthPct30d}%`;
    lines.push(
      `Last 30 days: ${perf.latestFollowers.toLocaleString()} followers (${growth}), ${perf.reachLast30d.toLocaleString()} reach, ${perf.engagementRatePct}% engagement rate.` +
        (perf.bestPlatform ? ` Best platform: ${getPlatform(perf.bestPlatform)?.name ?? perf.bestPlatform}.` : "") +
        (perf.bestPostingHour != null ? ` Typically posts around ${formatHour(perf.bestPostingHour)}.` : ""),
    );
  }

  if (sections.score && context.score) {
    lines.push(`Creator Score: ${context.score.total}/100 (${context.score.grade}).`);
  }

  if (sections.goals && context.goals.length > 0) {
    lines.push(`Active goals: ${context.goals.map((g) => `${g.metric} → ${g.target}${g.platform ? ` on ${getPlatform(g.platform)?.name ?? g.platform}` : ""} (${g.progressPct}% there)`).join("; ")}.`);
  }

  if (sections.achievements && context.recentAchievements.length > 0) {
    lines.push(`Recently unlocked: ${context.recentAchievements.join(", ")}.`);
  }

  if (sections.style && context.memory && context.memory.sampleCount > 0) {
    const m = context.memory;
    const styleBits = [
      m.preferredTone && `tone: ${m.preferredTone}`,
      m.writingStyle && `style: ${m.writingStyle}`,
      m.brandVoice && `brand voice: ${m.brandVoice}`,
      m.emojiUsage && `${m.emojiUsage} emoji use`,
      m.hashtagStyle && m.hashtagStyle !== "none" && `${m.hashtagStyle} hashtag use`,
      m.ctaStyle && `usually leans on ${m.ctaStyle}`,
    ].filter(Boolean);
    if (styleBits.length > 0) lines.push(`This creator's usual style (inferred from their own posts): ${styleBits.join(", ")}. Match it unless asked otherwise.`);
    if (m.contentCategories.length > 0) lines.push(`Content themes they post about: ${m.contentCategories.join(", ")}.`);
  }

  if (sections.topPosts && context.topPosts.length > 0) {
    lines.push(`Their best-performing recent posts: ${context.topPosts.map((p) => `"${p.title || "a post"}" on ${getPlatform(p.platform)?.name ?? p.platform} (${p.reach.toLocaleString()} reach, ${p.engagement.toLocaleString()} engagements)`).join("; ")}.`);
  }

  if (sections.recentTopics && context.recentTopics.length > 0) {
    lines.push(`They've recently asked AI for help with: ${context.recentTopics.join(", ")} — don't just repeat one of these back to them.`);
  }

  return lines.join(" ");
}

/** The chat panel's system prompt — same persona as before, now with real context appended. Falls back to the plain persona if context isn't available (new user, cache/DB hiccup) rather than failing the chat. */
export function buildChatSystemPrompt(context: CreatorContext | null): string {
  const summary = buildContextSummary(context, ALL_SECTIONS);
  return summary ? `${CHAT_SYSTEM}\n\nWhat you know about this specific creator: ${summary}` : CHAT_SYSTEM;
}

/** Smart Editor actions (caption/hook/hashtags/etc.) — lighter context than chat; a one-shot "write a hashtag list" doesn't need goals/achievements, but should still match their real voice and platform performance. */
export function buildActionContextSummary(context: CreatorContext | null): string {
  return buildContextSummary(context, { performance: true, style: true, recentTopics: true });
}

/** Creator Studio's "AI Write" (media → title/caption) — style match matters most here; performance context helps it lean into what's already working. */
export function buildStudioContextSummary(context: CreatorContext | null): string {
  return buildContextSummary(context, { performance: true, style: true, topPosts: true });
}

/** Growth Coach prompts want everything — the whole point is a synthesized view across performance/score/goals. */
export function buildCoachContextSummary(context: CreatorContext | null): string {
  return buildContextSummary(context, ALL_SECTIONS);
}

function formatHour(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}
