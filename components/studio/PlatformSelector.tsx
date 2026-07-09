"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { platforms, type PlatformId } from "@/config/platforms";

/** Multi-select platform picker. Future API-ready: emits the selected ids only. */
export default function PlatformSelector({
  selected,
  onChange,
}: {
  selected: PlatformId[];
  onChange: (ids: PlatformId[]) => void;
}) {
  const toggle = (id: PlatformId) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Publish to platforms">
      {platforms.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            aria-pressed={active}
            data-cursor="pointer"
            className={cn(
              "group relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
              active ? "bg-white/[0.04]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
            )}
            style={active ? { borderColor: `${p.color}66`, boxShadow: `inset 0 0 0 1px ${p.color}22` } : undefined}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              style={{ background: `${p.color}1f`, color: p.color }}
            >
              {p.glyph}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/80">{p.name}</span>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all",
                active ? "border-transparent" : "border-white/15"
              )}
              style={active ? { background: p.color } : undefined}
            >
              {active && <Check size={11} className="text-black/80" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
