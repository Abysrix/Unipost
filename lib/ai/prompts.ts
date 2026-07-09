import { getPlatform, type PlatformId } from "@/config/platforms";

/** The conversational persona for the chat panel (markdown allowed). */
export const CHAT_SYSTEM =
  "You are UniPost AI, an expert social-media content assistant for creators — especially India's creators. " +
  "You help plan, write, refine and grow content across Instagram, YouTube, LinkedIn, X, Facebook and Threads. " +
  "Be warm, sharp and practical. Prefer concrete, ready-to-use output over generic advice. " +
  "Use light markdown for structure. Keep responses focused.";

export type AIActionId =
  | "caption" | "hook" | "hashtags" | "cta" | "emoji"
  | "expand" | "shorten" | "grammar" | "rewrite"
  | "summarize" | "translate" | "optimize" | "improve";

export type ActionInputKind = "topic" | "text";

export interface ActionInput {
  text?: string;
  topic?: string;
  platform?: PlatformId;
  tone?: string;
  language?: string;
}

/** UI-agnostic metadata (icons live in the UI layer). */
export const AI_ACTIONS: Record<AIActionId, { label: string; description: string; category: string; kind: ActionInputKind }> = {
  caption: { label: "Caption", description: "Write a scroll-stopping caption", category: "Generate", kind: "topic" },
  hook: { label: "Hooks", description: "5 attention-grabbing openers", category: "Generate", kind: "topic" },
  hashtags: { label: "Hashtags", description: "Relevant, mixed-reach tags", category: "Enhance", kind: "text" },
  cta: { label: "CTA", description: "Strong calls-to-action", category: "Enhance", kind: "text" },
  emoji: { label: "Add emojis", description: "Tasteful emoji styling", category: "Enhance", kind: "text" },
  expand: { label: "Expand", description: "Make it fuller", category: "Edit", kind: "text" },
  shorten: { label: "Shorten", description: "Make it punchier", category: "Edit", kind: "text" },
  grammar: { label: "Fix grammar", description: "Clean up clarity & spelling", category: "Edit", kind: "text" },
  rewrite: { label: "Rewrite", description: "Fresh take, same meaning", category: "Edit", kind: "text" },
  summarize: { label: "Summarize", description: "Condense the key points", category: "Edit", kind: "text" },
  translate: { label: "Translate", description: "Into another language", category: "Edit", kind: "text" },
  optimize: { label: "Optimize", description: "Tune for a platform", category: "Enhance", kind: "text" },
  improve: { label: "Improve", description: "Clarity, flow & engagement", category: "Edit", kind: "text" },
};

const OUTPUT_ONLY = "Return ONLY the requested content — no preamble, no explanation, no surrounding quotes.";

/** Build a one-shot prompt for an action + input. Used by the editor + tools. */
export function buildActionPrompt(action: AIActionId, input: ActionInput): { system: string; prompt: string } {
  const platform = input.platform ? getPlatform(input.platform)?.name : undefined;
  const forP = platform ? ` for ${platform}` : "";
  const tone = input.tone ? ` Tone: ${input.tone}.` : "";
  const subject = input.topic || input.text || "";
  const t = (input.text ?? "").trim();

  const system = `${CHAT_SYSTEM}\n${OUTPUT_ONLY}`;

  switch (action) {
    case "caption":
      return { system, prompt: `Write one scroll-stopping caption${forP} about: ${subject}.${tone} Keep it natural and human.` };
    case "hook":
      return { system, prompt: `Write 5 punchy opening hooks${forP} for a post about: ${subject}.${tone} One per line, numbered.` };
    case "hashtags":
      return { system, prompt: `Suggest 12 relevant, mixed-reach hashtags${forP} for this post. Space-separated, each starting with #:\n\n${t || subject}` };
    case "cta":
      return { system, prompt: `Suggest 3 strong calls-to-action for this post${forP}. One per line:\n\n${t || subject}` };
    case "emoji":
      return { system, prompt: `Rewrite this with tasteful, well-placed emojis (don't overdo it). Keep the words otherwise the same:\n\n${t}` };
    case "expand":
      return { system, prompt: `Expand this into a fuller, richer post while keeping the same voice${forP}:\n\n${t}` };
    case "shorten":
      return { system, prompt: `Make this shorter and punchier without losing the meaning${forP}:\n\n${t}` };
    case "grammar":
      return { system, prompt: `Fix grammar, spelling and clarity. Keep the meaning and voice unchanged:\n\n${t}` };
    case "rewrite":
      return { system, prompt: `Rewrite this in a fresh way with the same meaning.${tone}\n\n${t}` };
    case "summarize":
      return { system, prompt: `Summarize this concisely, keeping the key points:\n\n${t}` };
    case "translate":
      return { system, prompt: `Translate this into ${input.language || "Hindi"}, keeping the tone and nuance:\n\n${t}` };
    case "optimize":
      return { system, prompt: `Rewrite this optimized${forP} — right length, format and style for that platform:\n\n${t}` };
    case "improve":
    default:
      return { system, prompt: `Improve this text — clarity, flow and engagement — while keeping the original voice:\n\n${t}` };
  }
}
