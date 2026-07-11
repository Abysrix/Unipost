"use client";

import { Save, Copy, Trash2, CalendarClock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bottom action bar — delete / duplicate / save / schedule. */
export default function PostActions({
  isNew,
  saving,
  scheduling = false,
  isPublished = false,
  onSave,
  onDuplicate,
  onDelete,
  onSchedule,
}: {
  isNew: boolean;
  saving: boolean;
  scheduling?: boolean;
  isPublished?: boolean;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSchedule?: () => void;
}) {
  const btn = "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div>
        {!isNew && (
          <button type="button" onClick={onDelete} data-cursor="pointer" className={cn(btn, "text-red-300/80 hover:bg-red-500/10 hover:text-red-300")}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isNew && (
          <button type="button" onClick={onDuplicate} data-cursor="pointer" className={cn(btn, "border border-white/[0.1] text-white/70 hover:border-white/25 hover:text-white")}>
            <Copy size={15} /> Duplicate
          </button>
        )}
        
        {isPublished ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            data-cursor="pointer"
            className={cn(btn, "text-black transition-opacity [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] hover:opacity-90 disabled:opacity-50")}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save edit
          </button>
        ) : (
          <>
            <button type="button" onClick={onSave} disabled={saving} data-cursor="pointer" className={cn(btn, "border border-white/[0.12] text-white hover:border-white/30 disabled:opacity-60")}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </button>
            <button
              type="button"
              onClick={onSchedule}
              disabled={!onSchedule || scheduling}
              data-cursor="pointer"
              className={cn(btn, "text-black transition-opacity [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] hover:opacity-90 disabled:opacity-50")}
            >
              {scheduling ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} Schedule
            </button>
          </>
        )}
      </div>
    </div>
  );
}
