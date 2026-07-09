"use client";

import { Check, Loader2, AlertCircle, CircleDashed } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Autosave status pill — "Saving…", "Saved · 2m ago", "Unsaved", "Save failed". */
export default function SaveIndicator({
  status,
  lastEdited,
  dirty,
}: {
  status: SaveStatus;
  lastEdited?: string | null;
  dirty?: boolean;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-white/50">
        <Loader2 size={12} className="animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-red-400">
        <AlertCircle size={12} /> Save failed — retrying
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
        <CircleDashed size={12} /> Unsaved changes
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-aurora-green/80">
      <Check size={12} /> Saved{lastEdited ? ` · ${timeAgo(lastEdited)}` : ""}
    </span>
  );
}
