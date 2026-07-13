import { DEFAULT_MODEL, type ModelId } from "./models";
import type { ChatMessage } from "@/types/ai";

/**
 * OpenRouter AI service (originally Gemini). Uses the REST API
 * via fetch, with retry on transient failures and native SSE streaming.
 * Server-only: only import from route handlers / server actions.
 */

export class AIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.API_KEY;
  // This message reaches end users as-is (every AIError call site streams or
  // returns e.message directly) — it must never read like a setup
  // instruction aimed at a developer. The real "API_KEY env var" detail
  // still goes to the server log via the catch blocks that log AIError
  // separately (e.g. logAudit("api_error", ...)).
  if (!key) throw new AIError("AI features aren't available right now. We're on it — please try again shortly, or contact support if this continues.", 503);
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
  const messages = [];
  if (opts.system) {
    messages.push({ role: "system", content: opts.system });
  }
  messages.push(...opts.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content
  })));

  return {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.85,
    max_tokens: opts.maxOutputTokens ?? 2048,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Non-streaming generation with retry on 429 / 5xx. */
export async function generateText(opts: GenOptions): Promise<string> {
  const body = JSON.stringify(buildBody(opts));
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey()}`,
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "UniPost",
  };

  let lastErr: AIError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body,
      });
    } catch {
      lastErr = new AIError("Could not reach the AI service.", 503);
      await sleep(400 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const json = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "";
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
  const body = JSON.stringify({
    ...buildBody(opts),
    stream: true,
  });
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey()}`,
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "UniPost",
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body,
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
        const text: string = json?.choices?.[0]?.delta?.content ?? "";
        if (text) yield text;
      } catch {
        /* a JSON object split across chunks — the buffer reassembles it next read */
      }
    }
  }
}
