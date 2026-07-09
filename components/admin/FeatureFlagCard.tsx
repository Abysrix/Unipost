"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setFeatureFlagAction } from "@/app/(app)/admin/actions";
import type { FeatureFlag } from "@/types/admin";

const CATEGORY_COLOR: Record<FeatureFlag["category"], string> = {
  general: "#94a3b8",
  ai: "#a78bfa",
  beta: "#22d3ee",
  maintenance: "#f87171",
};

/** A single feature flag with its own toggle + busy state — the settings page renders a grid of these. */
export default function FeatureFlagCard({ flag }: { flag: FeatureFlag }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(flag.enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMaintenance = flag.key === "maintenance_mode";

  async function toggle() {
    const next = !enabled;
    if (isMaintenance && next) {
      const ok = window.confirm("Turning on maintenance mode blocks every non-admin user from the app immediately. Continue?");
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    const res = await setFeatureFlagAction(flag.id, next);
    setBusy(false);
    if (res.error) return setError(res.error);
    setEnabled(next);
    startTransition(() => router.refresh());
  }

  return (
    <div className={cn("rounded-xl border p-4", isMaintenance && enabled ? "border-red-500/30 bg-red-500/[0.04]" : "border-white/[0.06] bg-white/[0.015]")}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-white/85">{flag.name}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide" style={{ background: `${CATEGORY_COLOR[flag.category]}1f`, color: CATEGORY_COLOR[flag.category] }}>{flag.category}</span>
          </div>
          {flag.description && <p className="text-[11px] leading-relaxed text-white/40">{flag.description}</p>}
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          aria-pressed={enabled}
          aria-label={`Toggle ${flag.name}`}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", enabled ? "bg-aurora-teal" : "bg-white/[0.12]")}
        >
          {busy ? (
            <Loader2 size={12} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/70" />
          ) : (
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", enabled ? "translate-x-[22px]" : "translate-x-0.5")} />
          )}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
      <p className="font-mono text-[10px] text-white/25">{flag.key}</p>
    </div>
  );
}
