"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getUser";
import { generateText, AIError } from "@/lib/ai/gemini";
import { buildActionPrompt, type AIActionId, type ActionInput } from "@/lib/ai/prompts";
import * as ai from "@/lib/db/ai";
import { awardXp } from "@/lib/db/xp";
import { spendCredits, getCreditBalance } from "@/lib/db/billing";
import { costForAction } from "@/lib/billing/credits";
import { logAudit } from "@/lib/db/admin/audit";
import { actionInputSchema, savePromptSchema } from "@/lib/validations/ai";

async function guard() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

/* ── Conversations ── */
export async function getMessages(conversationId: string) {
  await guard();
  return ai.listMessages(conversationId);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  await guard();
  await ai.renameConversation(id, title);
  revalidatePath("/ai");
}
export async function togglePinConversation(id: string, pinned: boolean): Promise<void> {
  await guard();
  await ai.setConversationPinned(id, pinned);
  revalidatePath("/ai");
}
export async function deleteConversation(id: string): Promise<void> {
  await guard();
  await ai.deleteConversation(id);
  revalidatePath("/ai");
}

/* ── Saved prompts ── */
export async function savePrompt(input: { title: string; body: string; category: string }): Promise<{ id?: string; error?: string }> {
  await guard();
  const parsed = savePromptSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid prompt." };
  const p = await ai.createSavedPrompt(parsed.data);
  revalidatePath("/ai");
  return { id: p.id };
}
export async function togglePromptFavorite(id: string, favorite: boolean): Promise<void> {
  await guard();
  await ai.setPromptFavorite(id, favorite);
  revalidatePath("/ai");
}
export async function deletePrompt(id: string): Promise<void> {
  await guard();
  await ai.deleteSavedPrompt(id);
  revalidatePath("/ai");
}

/* ── Generation history ── */
export async function toggleGenerationFavorite(id: string, favorite: boolean): Promise<void> {
  await guard();
  await ai.setGenerationFavorite(id, favorite);
  revalidatePath("/ai");
}
export async function removeGeneration(id: string): Promise<void> {
  await guard();
  await ai.deleteGeneration(id);
  revalidatePath("/ai");
}

/* ── One-shot generation (editor + tools) ── */
export type RunResult = { output: string } | { error: string };

export async function runAction(action: AIActionId, input: ActionInput): Promise<RunResult> {
  const user = await guard();
  const parsedInput = actionInputSchema.safeParse(input);
  if (!parsedInput.success) return { error: parsedInput.error.issues[0]?.message ?? "Invalid input." };
  const cost = costForAction(action);

  // Gate BEFORE spending a real Gemini call — an insufficient balance shouldn't
  // cost an API call. The atomic spend after generation re-checks for real.
  const balance = await getCreditBalance();
  if (balance < cost) {
    return { error: `You're out of AI credits (${balance} left, this needs ${cost}). Upgrade your plan or wait for your next monthly reset.` };
  }

  const { system, prompt } = buildActionPrompt(action, input);
  const startedAt = Date.now();
  try {
    const output = await generateText({
      system,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
    });
    const durationMs = Date.now() - startedAt;
    try {
      const gen = await ai.insertGeneration(action, input as Record<string, unknown>, output, durationMs);
      revalidatePath("/ai");
      await awardXp("ai_generation", `generation:${gen.id}`);
      await spendCredits("ai_generation", cost, `generation:${gen.id}`);
    } catch {
      /* history + XP + credit spend are best-effort once generation succeeds */
    }
    return { output };
  } catch (e) {
    const message = e instanceof AIError ? e.message : "Generation failed. Please try again.";
    await logAudit("api_error", "gemini_request_failed", { actorId: user.id, message, metadata: { action, durationMs: Date.now() - startedAt } });
    return { error: message };
  }
}
