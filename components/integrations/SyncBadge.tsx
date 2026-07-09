"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTo } from "@/lib/schedule/timezone";

/** "Synced 3h ago" / "Never synced" / spinning "Syncing…" — reused wherever last-sync shows up. */
export default function SyncBadge({ lastSyncAt, syncing = false, className }: { lastSyncAt: string | null; syncing?: boolean; className?: string }) {
  const label = syncing ? "Syncing…" : !lastSyncAt ? "Never synced" : relativeTo(lastSyncAt) === "now" ? "Synced just now" : `Synced ${relativeTo(lastSyncAt)}`;
  return (
    <span className={cn("flex items-center gap-1 text-[11px] text-white/40", className)}>
      <RefreshCw size={11} className={syncing ? "animate-spin text-aurora-teal" : ""} />
      {label}
    </span>
  );
}
