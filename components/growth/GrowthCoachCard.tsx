"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Sparkles, History as HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthRecommendation } from "@/types/growth";
import { dismissRecommendation, completeRecommendation } from "@/app/(app)/growth/actions";
import EmptyState from "@/components/dashboard/EmptyState";
import RecommendationCard from "./RecommendationCard";

const ASK_PROMPT = "Based on my Creator Score and recent activity, what are the 3 highest-impact things I should do this week to grow faster?";

/**
 * GrowthCoachCard — UniPost's flagship: a live recommendation feed answering
 * "what should I do next?", plus a deep-link into the existing AI Studio chat
 * (reusing Sprint 4's conversation system rather than building a second one).
 */
export default function GrowthCoachCard({ recommendations }: { recommendations: GrowthRecommendation[] }) {
  const [items, setItems] = useState(recommendations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const active = items.filter((r) => r.status === "active");
  const history = items.filter((r) => r.status !== "active").sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  async function dismiss(id: string) {
    setBusyId(id);
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)));
    await dismissRecommendation(id);
    setBusyId(null);
  }
  async function complete(id: string) {
    setBusyId(id);
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)));
    await completeRecommendation(id);
    setBusyId(null);
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            <Bot size={16} className="text-black/80" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white">Growth Coach</h2>
            <p className="text-[12px] text-white/40">What to do next, not just what happened</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            <button onClick={() => setTab("active")} className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", tab === "active" ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70")}>
              Active {active.length > 0 && `· ${active.length}`}
            </button>
            <button onClick={() => setTab("history")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", tab === "history" ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70")}>
              <HistoryIcon size={11} /> History
            </button>
          </div>
          <Link
            href={`/ai?prompt=${encodeURIComponent(ASK_PROMPT)}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]"
          >
            <Sparkles size={12} /> Ask the coach
          </Link>
        </div>
      </div>

      {tab === "active" ? (
        active.length === 0 ? (
          <EmptyState compact icon={Bot} title="You're all caught up" description="No open recommendations right now — keep posting and I'll surface what matters." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((r) => (
              <RecommendationCard key={r.id} rec={r} onDismiss={dismiss} onComplete={complete} busy={busyId === r.id} />
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <EmptyState compact icon={HistoryIcon} title="No history yet" description="Dismissed and completed recommendations will show up here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {history.map((r) => (
            <RecommendationCard key={r.id} rec={r} readonly />
          ))}
        </div>
      )}
    </div>
  );
}
