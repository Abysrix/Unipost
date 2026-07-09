import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getUser";
import type { AIConversation, AIMessage, SavedPrompt, AIGeneration, MessageRole } from "@/types/ai";

/** Server-only AI data layer. RLS enforces per-user ownership. */

async function uid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/* ── Conversations ── */
const CONV_COLS = "id,user_id,title,pinned,created_at,updated_at,last_message_at";

export async function listConversations(): Promise<AIConversation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select(CONV_COLS)
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AIConversation[];
}

export async function createConversation(title: string): Promise<AIConversation> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: await uid(), title: title.slice(0, 80) || "New chat" })
    .select(CONV_COLS)
    .single();
  if (error) throw error;
  return data as unknown as AIConversation;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ai_conversations").update({ title: title.slice(0, 120) }).eq("id", id);
  if (error) throw error;
}

export async function setConversationPinned(id: string, pinned: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ai_conversations").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) throw error;
}

/* ── Messages ── */
const MSG_COLS = "id,conversation_id,user_id,role,content,created_at";

export async function listMessages(conversationId: string): Promise<AIMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select(MSG_COLS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AIMessage[];
}

/** Remove the most recent assistant reply in a conversation (used when regenerating). */
export async function deleteLastAssistantMessage(conversationId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const { error: delError } = await supabase.from("ai_messages").delete().eq("id", (data as { id: string }).id);
    if (delError) throw delError;
  }
}

export async function insertMessage(conversationId: string, role: MessageRole, content: string): Promise<AIMessage> {
  const supabase = createClient();
  const userId = await uid();
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role, content })
    .select(MSG_COLS)
    .single();
  if (error) throw error;
  // Bump the conversation so it sorts to the top.
  await supabase.from("ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
  return data as unknown as AIMessage;
}

/* ── Saved prompts ── */
const PROMPT_COLS = "id,user_id,title,body,category,favorite,created_at,updated_at";

export async function listSavedPrompts(): Promise<SavedPrompt[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_prompts")
    .select(PROMPT_COLS)
    .order("favorite", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedPrompt[];
}

export async function createSavedPrompt(p: { title: string; body: string; category: string }): Promise<SavedPrompt> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_prompts")
    .insert({ user_id: await uid(), title: p.title.slice(0, 120), body: p.body, category: p.category })
    .select(PROMPT_COLS)
    .single();
  if (error) throw error;
  return data as unknown as SavedPrompt;
}

export async function setPromptFavorite(id: string, favorite: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("saved_prompts").update({ favorite }).eq("id", id);
  if (error) throw error;
}

export async function deleteSavedPrompt(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("saved_prompts").delete().eq("id", id);
  if (error) throw error;
}

/* ── Generation history ── */
const GEN_COLS = "id,user_id,action,input,output,favorite,duration_ms,created_at";

export async function listGenerations(): Promise<AIGeneration[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("ai_generations").select(GEN_COLS).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as AIGeneration[];
}

export async function insertGeneration(action: string, input: Record<string, unknown>, output: string, durationMs?: number): Promise<AIGeneration> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_generations")
    .insert({ user_id: await uid(), action, input, output, duration_ms: durationMs ?? null })
    .select(GEN_COLS)
    .single();
  if (error) throw error;
  return data as unknown as AIGeneration;
}

export async function setGenerationFavorite(id: string, favorite: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ai_generations").update({ favorite }).eq("id", id);
  if (error) throw error;
}

export async function deleteGeneration(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ai_generations").delete().eq("id", id);
  if (error) throw error;
}

/* ── Usage counts (Creator Score's AI Utilization factor) ── */
export interface AiUsageCounts {
  generations: number;
  conversations: number;
  messages: number;
}

export async function countAiUsage(): Promise<AiUsageCounts> {
  const supabase = createClient();
  const [gens, convs, msgs] = await Promise.all([
    supabase.from("ai_generations").select("id", { count: "exact", head: true }),
    supabase.from("ai_conversations").select("id", { count: "exact", head: true }),
    supabase.from("ai_messages").select("id", { count: "exact", head: true }),
  ]);
  if (gens.error) throw gens.error;
  if (convs.error) throw convs.error;
  if (msgs.error) throw msgs.error;
  return { generations: gens.count ?? 0, conversations: convs.count ?? 0, messages: msgs.count ?? 0 };
}
