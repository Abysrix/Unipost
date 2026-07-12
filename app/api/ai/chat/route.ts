import { getCurrentUser } from "@/lib/auth/getUser";
import { streamGemini, AIError } from "@/lib/ai/gemini";
import { getCreatorContext } from "@/lib/ai/context";
import { buildChatSystemPrompt } from "@/lib/ai/promptBuilder";
import { inferAndUpdateMemory } from "@/lib/ai/memory";
import { DEFAULT_MODEL, isModelId } from "@/lib/ai/models";
import * as ai from "@/lib/db/ai";
import { awardXp } from "@/lib/db/xp";
import { spendCredits, getCreditBalance, getOrCreateSubscription } from "@/lib/db/billing";
import { CHAT_MESSAGE_COST } from "@/lib/billing/credits";
import { logAudit } from "@/lib/db/admin/audit";
import { chatMessageSchema } from "@/lib/validations/ai";
import type { ChatMessage } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat — streams a Gemini reply while persisting both the user
 * message and the assistant reply. Creates the conversation on the first turn
 * and returns its id in the `x-conversation-id` header.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Fail CLOSED on a transient balance-check error — failing open here would let
  // one free message through per hiccup, indefinitely, under any sustained DB issue.
  let balance = await getCreditBalance().catch(() => -1);
  if (balance < CHAT_MESSAGE_COST) {
    try {
      // Lazy-create subscription and seed credits for new users or new periods
      await getOrCreateSubscription();
      balance = await getCreditBalance();
    } catch {
      /* best-effort fallback */
    }
  }

  if (balance < CHAT_MESSAGE_COST) {
    return new Response(`You're out of AI credits (${balance} left). Upgrade your plan or wait for your next monthly reset.`, { status: 402 });
  }

  let payload: { conversationId?: string; content?: string; model?: string; regenerate?: boolean };
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const parsed = chatMessageSchema.safeParse({ content: payload.content ?? "" });
  if (!parsed.success) return new Response(parsed.error.issues[0]?.message ?? "Invalid message", { status: 400 });
  const content = parsed.data.content;
  const model = payload.model && isModelId(payload.model) ? payload.model : DEFAULT_MODEL;
  const regenerate = payload.regenerate === true;

  let convId: string;
  try {
    if (regenerate) {
      // Re-answer the latest user turn: drop the stale assistant reply, keep the user message.
      if (!payload.conversationId) return new Response("Bad request", { status: 400 });
      convId = payload.conversationId;
      await ai.deleteLastAssistantMessage(convId);
    } else if (payload.conversationId) {
      convId = payload.conversationId;
      await ai.insertMessage(convId, "user", content);
    } else {
      convId = (await ai.createConversation(content)).id;
      await ai.insertMessage(convId, "user", content);
      try {
        await awardXp("ai_conversation_started", `conversation:${convId}`);
      } catch {
        /* XP is best-effort */
      }
    }
  } catch {
    return new Response("Failed to start conversation", { status: 500 });
  }

  let messages: ChatMessage[];
  try {
    const history = await ai.listMessages(convId);
    messages = history
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  } catch {
    messages = [{ role: "user", content }];
  }

  const context = await getCreatorContext();
  const system = buildChatSystemPrompt(context);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const delta of streamGemini({ system, messages, model })) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
      } catch (e) {
        const msg = e instanceof AIError ? e.message : "Something went wrong generating a response.";
        controller.enqueue(encoder.encode((full ? "\n\n" : "") + `⚠ ${msg}`));
        await logAudit("api_error", "gemini_request_failed", { actorId: user.id, message: msg, metadata: { convId, streaming: true } });
      } finally {
        if (full.trim()) {
          try {
            const msg = await ai.insertMessage(convId, "assistant", full);
            await spendCredits("ai_chat", CHAT_MESSAGE_COST, `chat_message:${msg.id}`);
          } catch {
            /* best-effort persistence + credit spend */
          }
          await inferAndUpdateMemory(user.id).catch(() => {});
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-conversation-id": convId,
    },
  });
}
