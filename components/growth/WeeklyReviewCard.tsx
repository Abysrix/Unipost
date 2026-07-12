import { Sparkles, CheckCircle2, ListChecks } from "lucide-react";
import type { GrowthReport } from "@/types/growth";
import { formatDateTime } from "@/lib/schedule/timezone";

/** Weekly Review — the AI Growth Coach's synthesized narrative + short daily task list, regenerated at most weekly (`lib/ai/growthCoach.ts`). Same visual language as every other growth card; genuinely new content, not a redesign of anything existing. */
export default function WeeklyReviewCard({ report, timezone }: { report: GrowthReport | null; timezone: string }) {
  if (!report) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
          <Sparkles size={16} className="text-black/80" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-white">Weekly review</h2>
          <p className="text-[12px] text-white/40">Generated {formatDateTime(report.generated_at, timezone)}</p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-white/75">{report.summary}</p>

      {report.highlights.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {report.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-white/55">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-aurora-green" />
              {h}
            </li>
          ))}
        </ul>
      )}

      {report.daily_tasks.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            <ListChecks size={12} /> Today
          </div>
          <ul className="flex flex-col gap-1.5">
            {report.daily_tasks.map((t, i) => (
              <li key={i} className="text-[12px] text-white/70">
                {i + 1}. {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
