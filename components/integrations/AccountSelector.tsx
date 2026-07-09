"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectedAccount } from "@/types/integrations";

/** Picks among multiple connected accounts of the same platform. */
export default function AccountSelector({ accounts, value, onChange }: { accounts: ConnectedAccount[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = accounts.find((a) => a.id === value) ?? accounts[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (accounts.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/70 hover:border-white/20" aria-haspopup="listbox" aria-expanded={open}>
        {current?.display_name ?? "Select account"}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/[0.1] bg-bg-secondary p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {accounts.map((a) => (
            <button
              key={a.id}
              role="option"
              aria-selected={a.id === value}
              onClick={() => { onChange(a.id); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/[0.05]"
            >
              <Check size={13} className={cn("shrink-0", a.id === value ? "text-aurora-teal" : "text-transparent")} />
              <span className="min-w-0 flex-1 truncate">{a.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
