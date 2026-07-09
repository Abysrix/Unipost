"use client";

import { heatColor } from "@/lib/charts/svg";

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  value: number;
}

/** GitHub-style activity heatmap — one column per week, one cell per day. */
export default function CalendarHeatmap({ days, weeks = 18 }: { days: HeatmapDay[]; weeks?: number }) {
  const byDate = new Map(days.map((d) => [d.date, d.value]));
  const max = Math.max(...days.map((d) => d.value), 1);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const totalDays = weeks * 7;
  // Align the grid so the last column ends on the most recent Saturday.
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - totalDays + 1);

  const cells: { date: string; value: number; future: boolean }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, value: byDate.get(key) ?? 0, future: d.getTime() > today.getTime() });
  }
  const columns: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((c) => (
              <div
                key={c.date}
                title={`${c.date}: ${c.value} active`}
                className="h-[11px] w-[11px] rounded-[2px]"
                style={{ background: c.future ? "rgba(255,255,255,0.03)" : heatColor(c.value / max) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">
        Less
        {[0.1, 0.3, 0.6, 1].map((t) => (
          <span key={t} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: heatColor(t) }} />
        ))}
        More
      </div>
    </div>
  );
}
