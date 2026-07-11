"use client";

import { Save, Copy, Trash2, CalendarClock, Loader2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bottom action bar — delete / duplicate / save / publish now / schedule. */
export default function PostActions({
  isNew,
  saving,
  scheduling = false,
  publishing = false,
  isPublished = false,
  onSave,
  onDuplicate,
  onDelete,
  onSchedule,
  onPublishNow,
}: {
  isNew: boolean;
  saving: boolean;
  scheduling?: boolean;
  publishing?: boolean;
  isPublished?: boolean;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSchedule?: () => void;
  onPublishNow?: () => void;
}) {
  const btn = "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200";
  const busy = saving || scheduling || publishing;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div>
        {!isNew && (
          <button type="button" onClick={onDelete} disabled={busy} data-cursor="pointer" className={cn(btn, "text-red-300/80 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50")}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isNew && (
          <button type="button" onClick={onDuplicate} disabled={busy} data-cursor="pointer" className={cn(btn, "border border-white/[0.1] text-white/70 hover:border-white/25 hover:text-white disabled:opacity-50")}>
            <Copy size={15} /> Duplicate
          </button>
        )}

        {isPublished ? (
          /* Published post — single "Save edit" which propagates to platform */
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            data-cursor="pointer"
            className={cn(btn, "text-black transition-opacity [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] hover:opacity-90 disabled:opacity-50")}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save edit
          </button>
        ) : (
          <>
            {/* Save draft */}
            <button type="button" onClick={onSave} disabled={busy} data-cursor="pointer" className={cn(btn, "border border-white/[0.12] text-white hover:border-white/30 disabled:opacity-60")}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </button>

            {/* Publish now — only shown when onPublishNow is provided (platforms selected) */}
            {onPublishNow && (
              <button
                type="button"
                onClick={onPublishNow}
                disabled={busy}
                data-cursor="pointer"
                className={cn(btn, "border border-aurora-teal/30 bg-aurora-teal/10 text-aurora-teal hover:bg-aurora-teal/20 disabled:opacity-50")}
              >
                {publishing ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                {publishing ? "Publishing…" : "Publish now"}
              </button>
            )}

            {/* Schedule */}
            <button
              type="button"
              onClick={onSchedule}
              disabled={!onSchedule || busy}
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
