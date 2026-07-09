import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { listConversations, listSavedPrompts, listGenerations } from "@/lib/db/ai";
import PageHeader from "@/components/dashboard/PageHeader";
import AIStudio from "@/components/ai/AIStudio";
import type { AIConversation, SavedPrompt, AIGeneration } from "@/types/ai";

export const metadata: Metadata = { title: "AI Studio · UniPost" };
export const dynamic = "force-dynamic";

export default async function AIStudioPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireUser();

  // Best-effort: if the AI tables aren't migrated yet, the studio still loads empty.
  let conversations: AIConversation[] = [];
  let prompts: SavedPrompt[] = [];
  let generations: AIGeneration[] = [];
  try {
    [conversations, prompts, generations] = await Promise.all([listConversations(), listSavedPrompts(), listGenerations()]);
  } catch {
    /* tables not ready — render an empty studio */
  }

  const promptParam = searchParams.prompt;
  const initialPrompt = typeof promptParam === "string" ? promptParam : undefined;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="AI Studio" description="Generate captions, hooks, scripts and ideas in your voice." icon={Sparkles} />
      <AIStudio initialConversations={conversations} initialPrompts={prompts} initialGenerations={generations} initialPrompt={initialPrompt} />
    </div>
  );
}
