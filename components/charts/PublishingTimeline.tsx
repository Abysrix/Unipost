"use client";

import BarChart, { type BarDatum } from "./BarChart";

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  count: number;
}

/** PublishingTimeline — posts published per day, most recent N days. */
export default function PublishingTimeline({ points }: { points: TimelinePoint[] }) {
  const data: BarDatum[] = points.map((p) => ({
    label: new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: p.count,
  }));
  return <BarChart data={data} height={120} formatValue={(n) => `${n} post${n === 1 ? "" : "s"}`} />;
}
