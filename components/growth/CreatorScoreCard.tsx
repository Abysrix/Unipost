"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { SCORE_FACTOR_LABELS } from "@/lib/growth/score";
import type { CreatorScoreRow } from "@/types/growth";
import TrendChart from "@/components/charts/TrendChart";

const GRADE_COLOR: Record<string, string> = { "A+": "#34d399", A: "#2dd4bf", B: "#22d3ee", C: "#facc15", D: "#fb923c", F: "#f87171" };

/** CreatorScoreCard — the score ring, grade, trend, and factor breakdown. */
export default function CreatorScoreCard({ score, history }: { score: CreatorScoreRow; history: CreatorScoreRow[] }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score.score / 100);
  const gradeColor = GRADE_COLOR[score.grade] ?? "#2dd4bf";

  const prior = history.find((h) => h.id !== score.id);
  const delta = prior ? score.score - prior.score : 0;
  const trend = [...history].reverse().map((h) => h.score);

  const factors = (Object.keys(SCORE_FACTOR_LABELS) as (keyof typeof SCORE_FACTOR_LABELS)[]).map((key) => ({
    key,
    ...SCORE_FACTOR_LABELS[key],
    value: score[key],
  }));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative flex h-[148px] w-[148px] shrink-0 items-center justify-center">
          <svg width="148" height="148" className="-rotate-90">
            <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="74" cy="74" r={R} fill="none" stroke="url(#scoreGrad)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              style={{ filter: "drop-shadow(0 0 10px rgba(45,212,191,0.45))", transition: "stroke-dashoffset 0.8s ease" }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-4xl font-bold text-white">{score.score}</span>
            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: gradeColor, background: `${gradeColor}18` }}>
              {score.grade}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">Creator Score</h2>
            {history.length > 1 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${delta >= 0 ? "text-aurora-green" : "text-red-400"}`}>
                {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {Math.abs(delta)} pts
              </span>
            )}
          </div>
          <p className="mb-4 text-[13px] text-white/40">Updated daily from your real activity, engagement and AI usage.</p>
          {trend.length > 1 && <TrendChart series={[{ label: "Score", values: trend, color: gradeColor }]} variant="area" height={64} />}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {factors.map((f) => (
          <div key={f.key} className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/60">{f.label}</span>
              <span className="font-mono text-[11px] text-white/40">{f.value}</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full [background:linear-gradient(90deg,#22d3ee,#34d399)]" style={{ width: `${f.value}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/30">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
