"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncAnalyticsNowAction } from "@/app/(app)/analytics/actions";

/** Manual analytics sync trigger — same button styling as `ConnectionCard`'s existing "Sync now" (Integrations, Sprint 7). */
export default function SyncAnalyticsButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-red-400">{error}</span>}
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await syncAnalyticsNowAction();
            if (!result.ok) setError(result.error ?? "Sync failed.");
            router.refresh();
          })
        }
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync now
      </button>
    </div>
  );
}
