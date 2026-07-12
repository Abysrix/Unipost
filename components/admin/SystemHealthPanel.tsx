"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { overallStatus } from "@/lib/admin/health-checks";
import { runHealthCheckAction } from "@/app/(app)/admin/actions";
import type { HealthCheck } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import HealthCard from "./HealthCard";

export default function SystemHealthPanel({ initialChecks, lastCheckedAt }: { initialChecks: HealthCheck[]; lastCheckedAt: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checks, setChecks] = useState(initialChecks);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await runHealthCheckAction();
    setBusy(false);
    if (res.error) return setError(res.error);
    // Merge by component id rather than replace the array — runHealthCheckAction
    // only ever recomputes the manual config-presence checks, so replacing
    // outright would drop the live DB-driven checks (queue depth, cron
    // recency, webhooks — Integration Sprint 6) that aren't part of its result.
    if (res.checks) {
      setChecks((prev) => {
        const byId = new Map(prev.map((c) => [c.component, c]));
        for (const c of res.checks!) byId.set(c.component, c);
        return Array.from(byId.values());
      });
    }
    startTransition(() => router.refresh());
  }

  const status = checks.length > 0 ? overallStatus(checks) : "unknown";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-[13px] text-white/50">{lastCheckedAt ? `Last checked ${new Date(lastCheckedAt).toLocaleString("en-IN")}` : "Never checked — run a check to populate this page."}</span>
        </div>
        <button onClick={run} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Run health check
        </button>
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-400">{error}</p>}

      {checks.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/35">No health data yet — click &quot;Run health check&quot; above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((c) => (
            <HealthCard key={c.component} check={c} />
          ))}
        </div>
      )}
    </div>
  );
}
