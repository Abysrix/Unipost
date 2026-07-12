"use server";

import { getCurrentUser } from "@/lib/auth/getUser";
import { generateText } from "@/lib/ai/gemini";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { getCreatorContext } from "@/lib/ai/context";
import { buildStudioContextSummary } from "@/lib/ai/promptBuilder";
import { inferAndUpdateMemory } from "@/lib/ai/memory";
import type { PlatformId } from "@/config/platforms";
import type { PostMedia } from "@/types/post";
import { checkRateLimit } from "@/lib/security/rateLimit";

export interface AIWriteResult {
  title: string;
  content: string;
}

/**
 * Analyzes the uploaded media (filenames + types) and the selected platforms,
 * then generates an optimized title, description, hashtags, and keywords —
 * pre-formatted and ready to paste into the post editor.
 */
export async function analyzeMediaForPost(
  media: PostMedia[],
  platforms: PlatformId[],
  existingTitle?: string,
  existingContent?: string,
): Promise<{ ok: true; result: AIWriteResult } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const rateOk = await checkRateLimit("ai_write", 10, 120);
  if (!rateOk) return { ok: false, error: "Too many AI generation requests. Please try again in 2 minutes." };

  if (!process.env.API_KEY) return { ok: false, error: "AI is not configured." };

  const platformList = platforms.length > 0 ? platforms.join(", ").toUpperCase() : "social media";
  const mediaList = media
    .map((m) => `- ${m.name} (${m.type})`)
    .join("\n");

  const isVideo = media.some((m) => m.type === "video");
  const isYouTube = platforms.includes("youtube");

  const contextHints = [
    existingTitle ? `Existing title hint: "${existingTitle}"` : "",
    existingContent ? `Existing content hint: "${existingContent.slice(0, 300)}"` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const creatorContext = await getCreatorContext();
  const creatorSummary = buildStudioContextSummary(creatorContext);

  const prompt = `You are a viral social-media content expert specializing in ${platformList}.
${creatorSummary ? `\nWhat you know about this specific creator: ${creatorSummary}\n` : ""}

The creator has uploaded the following media:
${mediaList || "- (no media, text post)"}

${contextHints ? `Context from the creator:\n${contextHints}\n` : ""}

Your task: Generate a complete, high-performing post package for ${platformList}.

${isVideo && isYouTube ? `This is a YouTube ${media.some((m) => m.name?.toLowerCase().includes("short")) || media.some((m) => m.type === "video") ? "Short" : "video"} — optimize for YouTube SEO.` : ""}

Return ONLY a valid JSON object (no markdown, no code fences) with exactly this structure:
{
  "title": "Catchy, SEO-optimized title (max 100 chars for YouTube, 60 for others)",
  "content": "Full description or caption with emojis, call to action, keywords paragraph, and hashtags at the end — formatted for ${platformList}"
}

Requirements for "content":
- Start with a compelling hook sentence
- Include 2-3 lines of value/description
- Add a question to drive comments
- Include "Subscribe" or "Follow" CTA
- List 5-8 SEO keywords inline
- End with 8-12 relevant hashtags on a separate line
- Use emojis tastefully throughout
- Keep the total under 4500 characters`;

  try {
    const raw = await generateText({
      system: CHAT_SYSTEM,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      maxOutputTokens: 1500,
    });

    // Strip any markdown code fences if the model added them anyway
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: AIWriteResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: try to extract JSON object from the response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        // Last resort: use the raw text as content
        return { ok: true, result: { title: existingTitle || "", content: raw } };
      }
    }

    if (!parsed.title && !parsed.content) {
      return { ok: false, error: "AI returned an empty result. Please try again." };
    }

    await inferAndUpdateMemory(user.id).catch(() => {});
    return { ok: true, result: { title: parsed.title || "", content: parsed.content || "" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI generation failed." };
  }
}
