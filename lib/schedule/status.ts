import { FileText, Clock, ListOrdered, Loader2, CheckCircle2, AlertTriangle, Archive, Ban, type LucideIcon } from "lucide-react";
import type { LifecycleStatus } from "@/types/schedule";

/** Presentation metadata for every lifecycle state. Single source of truth for
 *  status colors/labels/icons — used by PublishingStatus and everywhere else. */
export interface StatusMeta {
  label: string;
  /** Tailwind text color class. */
  text: string;
  /** Tailwind bg tint class. */
  bg: string;
  /** Raw hex (for dots / calendar accents). */
  hex: string;
  icon: LucideIcon;
}

export const STATUS_META: Record<LifecycleStatus, StatusMeta> = {
  draft:      { label: "Draft",      text: "text-white/50",     bg: "bg-white/[0.06]",       hex: "#9ca3af", icon: FileText },
  scheduled:  { label: "Scheduled",  text: "text-aurora-teal",  bg: "bg-aurora-teal/12",     hex: "#2dd4bf", icon: Clock },
  queued:     { label: "Queued",     text: "text-aurora-cyan",  bg: "bg-aurora-cyan/12",     hex: "#22d3ee", icon: ListOrdered },
  publishing: { label: "Publishing", text: "text-amber-300",    bg: "bg-amber-400/12",       hex: "#fbbf24", icon: Loader2 },
  published:  { label: "Published",  text: "text-aurora-green", bg: "bg-aurora-green/12",    hex: "#34d399", icon: CheckCircle2 },
  failed:     { label: "Failed",     text: "text-red-400",      bg: "bg-red-500/12",         hex: "#f87171", icon: AlertTriangle },
  canceled:   { label: "Canceled",   text: "text-white/40",     bg: "bg-white/[0.05]",       hex: "#6b7280", icon: Ban },
  archived:   { label: "Archived",   text: "text-white/45",     bg: "bg-white/[0.05]",       hex: "#71717a", icon: Archive },
};

export function statusMeta(status: LifecycleStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.draft;
}

/** Ordered lifecycle for progress display: Draft → … → Published. */
export const LIFECYCLE_ORDER: LifecycleStatus[] = ["draft", "scheduled", "queued", "publishing", "published"];
