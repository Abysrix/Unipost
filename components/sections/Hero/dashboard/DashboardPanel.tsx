"use client";

import { Star } from "lucide-react";
import DashboardCard from "@/components/ui/DashboardCard";
import { useCountUp } from "@/hooks/useCountUp";
import { creator, stats } from "./data";
import StatTile from "./StatTile";
import GrowthChart from "./GrowthChart";
import PlatformRow from "./PlatformRow";
import CalendarStrip from "./CalendarStrip";
import ScheduleTimeline from "./ScheduleTimeline";

/** The main dashboard "app screen" — the product, composed from live widgets. */
export default function DashboardPanel({ live }: { live: boolean }) {
  const score = useCountUp(creator.score, { active: live, duration: 1600 });

  return (
    <DashboardCard chrome url="app.unipost.bharvix.com/dashboard" className="w-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-sm font-semibold text-white">Good morning, {creator.name} ✦</div>
          <div className="text-[11px] text-white/30">Here&apos;s your creator snapshot</div>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.24)" }}
        >
          <Star size={11} className="text-aurora-teal" />
          <span className="text-[11px] font-medium tabular-nums text-aurora-teal">Creator Score {Math.round(score)}</span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <StatTile key={s.key} label={s.label} value={s.value} delta={s.delta} accent={s.accent} live={live} />
        ))}
      </div>

      {/* Growth chart */}
      <div className="mb-3">
        <GrowthChart live={live} />
      </div>

      {/* Platforms */}
      <div className="mb-3">
        <PlatformRow live={live} />
      </div>

      {/* Calendar + schedule */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CalendarStrip live={live} />
        <ScheduleTimeline live={live} />
      </div>
    </DashboardCard>
  );
}
