"use client";

import { motion } from "framer-motion";
import { getPlatform } from "@/config/platforms";
import { schedule } from "./data";

/** Today's schedule — time-stamped posts with platform + status. Items rise in. */
export default function ScheduleTimeline({ live }: { live: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-white/40">Today&apos;s Schedule</div>
      <div className="flex flex-col gap-2">
        {schedule.map((item, i) => {
          const p = getPlatform(item.platform);
          return (
            <motion.div
              key={i}
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -10 }}
              animate={live ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.12 }}
            >
              <span className="w-9 shrink-0 font-mono text-[10px] text-white/35">{item.time}</span>
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
                style={{ background: `${p?.color}22`, color: p?.color }}
              >
                {p?.glyph}
              </span>
              <span className="flex-1 truncate text-[11px] text-white/55">{item.title}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] uppercase tracking-wide ${
                  item.status === "scheduled" ? "bg-aurora-green/15 text-aurora-green" : "bg-white/[0.06] text-white/40"
                }`}
              >
                {item.status}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
