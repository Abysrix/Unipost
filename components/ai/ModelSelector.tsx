"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_MODELS, type ModelId } from "@/lib/ai/models";

/** Model picker (future-ready). Compact dropdown for the prompt bar. */
export default function ModelSelector({ value, onChange }: { value: ModelId; onChange: (m: ModelId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/80" aria-haspopup="listbox" aria-expanded={open}>
        <Cpu size={13} /> {current.name}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-white/[0.1] bg-bg-secondary p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              role="option"
              aria-selected={m.id === value}
              onClick={() => { onChange(m.id); setOpen(false); }}
              className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]"
            >
              <Check size={14} className={cn("mt-0.5 shrink-0", m.id === value ? "text-aurora-teal" : "text-transparent")} />
              <span>
                <span className="block text-[13px] font-medium text-white">{m.name}</span>
                <span className="block text-[11px] text-white/40">{m.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
