"use client";

import { Star, Trash2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedPrompt } from "@/types/ai";

/** A saved prompt — use it, favorite it, or delete it. */
export default function PromptCard({
  prompt,
  onUse,
  onFavorite,
  onDelete,
}: {
  prompt: SavedPrompt;
  onUse: (body: string) => void;
  onFavorite: (id: string, favorite: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.14]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-white">{prompt.title}</h3>
        <button onClick={() => onFavorite(prompt.id, !prompt.favorite)} aria-label="Favorite" className="shrink-0">
          <Star size={15} className={cn("transition-colors", prompt.favorite ? "fill-aurora-yellow text-aurora-yellow" : "text-white/25 hover:text-white/50")} />
        </button>
      </div>
      <p className="line-clamp-3 flex-1 text-[12px] leading-relaxed text-white/45">{prompt.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/40">{prompt.category}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onUse(prompt.body)} className="flex items-center gap-1 rounded-lg border border-white/[0.1] px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:border-aurora-teal/40 hover:text-white">
            <CornerDownLeft size={12} /> Use
          </button>
          <button onClick={() => onDelete(prompt.id)} aria-label="Delete prompt" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
