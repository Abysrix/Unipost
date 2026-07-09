"use client";

import { X } from "lucide-react";

/** Floating bar shown when 1+ rows are selected in an admin table. */
export default function BulkActionBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-aurora-teal/25 bg-aurora-teal/[0.06] px-4 py-2.5">
      <span className="text-[13px] font-medium text-white">{count} selected</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button onClick={onClear} className="ml-auto flex items-center gap-1 text-[12px] text-white/50 hover:text-white/80">
        <X size={12} /> Clear
      </button>
    </div>
  );
}
