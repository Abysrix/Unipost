import { Trophy } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import { summary } from "@/lib/mock/dashboard";

/** Creator Score snapshot — ring + level + XP, links to the full page. */
export default function CreatorScorePreview() {
  const R = 34, C = 2 * Math.PI * R;
  const offset = C * (1 - summary.creatorScore / 100);
  return (
    <WidgetContainer title="Creator Score" icon={Trophy} action={{ label: "Details", href: "/score" }}>
      <div className="flex items-center gap-5">
        <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center">
          <svg width="92" height="92" className="-rotate-90">
            <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            <circle cx="46" cy="46" r={R} fill="none" stroke="url(#scorePrevGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ filter: "drop-shadow(0 0 6px rgba(45,212,191,0.5))" }} />
            <defs><linearGradient id="scorePrevGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#facc15" /></linearGradient></defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-white">{summary.creatorScore}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2"><span className="font-display text-base font-bold text-white">Level {summary.level}</span><span className="rounded-full bg-aurora-teal/15 px-2 py-0.5 text-[10px] text-aurora-teal">Creator</span></div>
          <div className="mb-1.5 flex justify-between text-[11px] text-white/40"><span>XP</span><span>{summary.xp}%</span></div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full [background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)]" style={{ width: `${summary.xp}%` }} />
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}
