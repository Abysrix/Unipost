"use client";

import { useState } from "react";
import { Search, Star, Copy, Check, Trash2, CornerDownLeft, History } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { AI_ACTIONS, type AIActionId } from "@/lib/ai/prompts";
import type { AIGeneration } from "@/types/ai";
import EmptyState from "@/components/dashboard/EmptyState";

function Row({ gen, onFavorite, onDelete, onReuse }: { gen: AIGeneration; onFavorite: (id: string, f: boolean) => void; onDelete: (id: string) => void; onReuse: (text: string) => void }) {
  const [copied, setCopied] = useState(false);
  const label = AI_ACTIONS[gen.action as AIActionId]?.label ?? gen.action;
  const copy = async () => {
    await navigator.clipboard.writeText(gen.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-aurora-teal/12 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-aurora-teal">{label}</span>
          <span className="text-[11px] text-white/30">{timeAgo(gen.created_at)}</span>
        </div>
        <button onClick={() => onFavorite(gen.id, !gen.favorite)} aria-label="Favorite">
          <Star size={15} className={cn("transition-colors", gen.favorite ? "fill-aurora-yellow text-aurora-yellow" : "text-white/25 hover:text-white/50")} />
        </button>
      </div>
      <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-white/60">{gen.output}</p>
      <div className="mt-3 flex items-center gap-1.5">
        <button onClick={copy} className="flex items-center gap-1 rounded-lg border border-white/[0.1] px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
          {copied ? <Check size={12} className="text-aurora-green" /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={() => onReuse(gen.output)} className="flex items-center gap-1 rounded-lg border border-white/[0.1] px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:border-aurora-teal/40 hover:text-white">
          <CornerDownLeft size={12} /> Reuse
        </button>
        <button onClick={() => onDelete(gen.id)} aria-label="Delete" className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function GenerationHistory({
  generations,
  onFavorite,
  onDelete,
  onReuse,
}: {
  generations: AIGeneration[];
  onFavorite: (id: string, favorite: boolean) => void;
  onDelete: (id: string) => void;
  onReuse: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = generations.filter((g) => g.output.toLowerCase().includes(query.toLowerCase()) || g.action.includes(query.toLowerCase()));

  if (generations.length === 0) {
    return <EmptyState icon={History} title="No AI history yet" description="Generations from the editor and tools will show up here." />;
  }

  return (
    <div>
      <div className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
        <Search size={14} className="text-white/30" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history" aria-label="Search history" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((g) => (
          <Row key={g.id} gen={g} onFavorite={onFavorite} onDelete={onDelete} onReuse={onReuse} />
        ))}
      </div>
    </div>
  );
}
