"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { ModelId } from "@/lib/ai/models";
import AIMessage from "./AIMessage";
import PromptInput from "./PromptInput";

export type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Write 5 scroll-stopping hooks about my morning routine",
  "Turn this idea into a LinkedIn post: consistency beats motivation",
  "Give me a 6-tweet thread on growing on Instagram in 2025",
  "Write an Instagram caption for a behind-the-scenes reel",
  "Suggest 12 hashtags for a fitness transformation post",
  "Rewrite this to sound more confident: I think my product is kind of good",
];

export default function AIChat({
  messages,
  streaming,
  input,
  onInputChange,
  onSend,
  onStop,
  onRegenerate,
  onExample,
  onInsert,
  model,
  onModelChange,
}: {
  messages: ChatMsg[];
  streaming: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRegenerate: () => void;
  onExample: (text: string) => void;
  onInsert?: (text: string) => void;
  model: ModelId;
  onModelChange: (m: ModelId) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i;
    return -1;
  })();

  return (
    <div className="flex h-full min-h-[60vh] flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] lg:min-h-0">
      <div className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
              <Sparkles size={24} className="text-black/80" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-white">UniPost AI</h2>
              <p className="mt-1 text-sm text-white/45">Your content co-pilot. Ask for captions, hooks, threads — anything.</p>
            </div>
            <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((q) => (
                <button key={q} onClick={() => onExample(q)} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-left text-[13px] text-white/60 transition-colors hover:border-aurora-teal/30 hover:text-white/90">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {messages.map((m, i) => (
              <AIMessage
                key={m.id}
                role={m.role}
                content={m.content}
                streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                isLast={i === lastAssistantIdx && !streaming}
                onRegenerate={onRegenerate}
                onInsert={onInsert}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.05] p-3">
        <div className="mx-auto max-w-2xl">
          <PromptInput value={input} onChange={onInputChange} onSend={onSend} onStop={onStop} streaming={streaming} model={model} onModelChange={onModelChange} />
        </div>
      </div>
    </div>
  );
}
