"use client";

import Link from "next/link";
import { Sparkles, X, Check, TrendingUp, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthRecommendation, RecommendationSeverity } from "@/types/growth";

const SEVERITY: Record<RecommendationSeverity, { text: string; ring: string; icon: typeof Info }> = {
  danger: { text: "text-red-400", ring: "border-red-500/20 bg-red-500/[0.04]", icon: XCircle },
  warning: { text: "text-amber-300", ring: "border-amber-400/20 bg-amber-400/[0.04]", icon: AlertTriangle },
  success: { text: "text-aurora-green", ring: "border-aurora-green/20 bg-aurora-green/[0.04]", icon: TrendingUp },
  info: { text: "text-aurora-teal", ring: "border-white/[0.07] bg-white/[0.02]", icon: Info },
};

/** RecommendationCard — one AI Growth Coach card: insight + action + dismiss/complete. */
export default function RecommendationCard({
  rec,
  onDismiss,
  onComplete,
  busy = false,
  readonly = false,
}: {
  rec: GrowthRecommendation;
  onDismiss?: (id: string) => void;
  onComplete?: (id: string) => void;
  busy?: boolean;
  readonly?: boolean;
}) {
  const s = SEVERITY[rec.severity];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-2xl border p-4", s.ring)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]")}>
          <Icon size={15} className={s.text} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white">{rec.title}</p>
            {rec.source === "ai" && (
              <span title="AI-enhanced">
                <Sparkles size={11} className="shrink-0 text-aurora-cyan" />
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">{rec.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {rec.action_href && rec.action_label && (
              <Link href={rec.action_href} className={cn("rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors hover:brightness-125", s.ring, s.text)}>
                {rec.action_label}
              </Link>
            )}
            {!readonly && rec.status === "active" && (
              <>
                {onComplete && (
                  <button onClick={() => onComplete(rec.id)} disabled={busy} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80 disabled:opacity-40">
                    <Check size={12} /> Mark done
                  </button>
                )}
                {onDismiss && (
                  <button onClick={() => onDismiss(rec.id)} disabled={busy} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80 disabled:opacity-40">
                    <X size={12} /> Dismiss
                  </button>
                )}
              </>
            )}
            {readonly && rec.status !== "active" && (
              <span className="text-[11px] capitalize text-white/25">{rec.status}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
