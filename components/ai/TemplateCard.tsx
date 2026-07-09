"use client";

import { ArrowUpRight } from "lucide-react";
import { getPlatform } from "@/config/platforms";
import type { AITemplate } from "@/lib/ai/templates";

/** A starter template — click to load its prompt into the chat. */
export default function TemplateCard({ template, onUse }: { template: AITemplate; onUse: (prompt: string) => void }) {
  const p = template.platform ? getPlatform(template.platform) : null;
  return (
    <button
      onClick={() => onUse(template.prompt)}
      className="group flex h-full flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.16]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style={{ background: p ? `${p.color}1f` : "rgba(45,212,191,0.12)", color: p?.color ?? "#2dd4bf" }}>
          {p?.glyph ?? "✦"}
        </span>
        <ArrowUpRight size={15} className="text-white/20 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/50" />
      </div>
      <h3 className="text-sm font-semibold text-white">{template.name}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-white/40">{template.description}</p>
      <span className="mt-3 inline-flex w-fit rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/40">{template.category}</span>
    </button>
  );
}
