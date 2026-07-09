import { DEFAULT_MODEL, type ModelId } from "./models";
import type { ChatMessage } from "@/types/ai";

/**
 * Gemini service — the single place AI calls live (Phase 1). Uses the REST API
 * via fetch (no SDK dependency), with retry on transient failures and native
 * SSE streaming. Server-only: only import from route handlers / server actions.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class AIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIError("AI is not configured — add GEMINI_API_KEY to your environment.", 503);
  return key;
}

export interface GenOptions {
  system?: string;
  messages: ChatMessage[];
  model?: ModelId;
  temperature?: number;
  maxOutputTokens?: number;
}

function buildBody(opts: GenOptions) {
  return {
    ...(opts.system ? { system_instruction: { parts: [{ text: opts.system }] } } : {}),
    contents: opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: opts.temperature ?? 0.9,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      topP: 0.95,
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Part = { text?: string };

/** Non-streaming generation with retry on 429 / 5xx. */
export async function generateText(opts: GenOptions): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL;
  const url = `${BASE}/${model}:generateContent?key=${apiKey()}`;
  const body = JSON.stringify(buildBody(opts));

  let lastErr: AIError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    } catch {
      lastErr = new AIError("Could not reach the AI service.", 503);
      await sleep(400 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const json = await res.json();
      const text: string = (json?.candidates?.[0]?.content?.parts as Part[] | undefined)?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) throw new AIError("The model returned an empty response.", 502);
      return text.trim();
    }
    lastErr = new AIError(`AI request failed (${res.status}).`, res.status);
    if (res.status !== 429 && res.status < 500) break; // don't retry client errors
    await sleep(400 * (attempt + 1));
  }
  throw lastErr ?? new AIError("AI request failed.", 500);
}

/** Streaming generation — yields text deltas as they arrive (SSE). */
export async function* streamGemini(opts: GenOptions): AsyncGenerator<string> {
  const model = opts.model ?? DEFAULT_MODEL;
  const url = `${BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBody(opts)),
  });
  if (!res.ok || !res.body) throw new AIError(`AI request failed (${res.status}).`, res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const text: string = (json?.candidates?.[0]?.content?.parts as Part[] | undefined)?.map((p) => p.text ?? "").join("") ?? "";
        if (text) yield text;
      } catch {
        /* a JSON object split across chunks — the buffer reassembles it next read */
      }
    }
  }
}
