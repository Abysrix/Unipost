"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { ModelId } from "@/lib/ai/models";
import ModelSelector from "./ModelSelector";

/** The chat composer — auto-growing textarea, model selector, send/stop. */
export default function PromptInput({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  model,
  onModelChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  model: ModelId;
  onModelChange: (m: ModelId) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim()) onSend();
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-2 backdrop-blur-sm focus-within:border-white/20">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ask UniPost AI anything — captions, hooks, a whole content plan…"
        aria-label="Message"
        className="w-full resize-none bg-transparent px-2 py-1.5 text-[14px] text-white outline-none placeholder:text-white/30"
        style={{ maxHeight: 200 }}
      />
      <div className="flex items-center justify-between px-1">
        <ModelSelector value={model} onChange={onModelChange} />
        {streaming ? (
          <button onClick={onStop} aria-label="Stop generating" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.12] text-white/70 transition-colors hover:border-white/30 hover:text-white">
            <Square size={13} className="fill-current" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim()}
            aria-label="Send"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-black transition-opacity [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] disabled:opacity-40"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
