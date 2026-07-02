"use client";

import { motion } from "framer-motion";
import { weekDays, calendar, todayIndex } from "./data";

/** A week calendar strip — today is highlighted; hovering a day lifts it. */
export default function CalendarStrip({ live }: { live: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">This Week</span>
        <span className="text-[9px] text-white/30">13 posts</span>
      </div>
      <div className="flex items-end justify-between gap-1.5">
        {weekDays.map((d, i) => {
          const isToday = i === todayIndex;
          const count = calendar[i];
          return (
            <motion.div
              key={i}
              className="group flex flex-1 cursor-pointer flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={live ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex flex-col-reverse items-center gap-0.5" style={{ minHeight: 34 }}>
                {Array.from({ length: count }).map((_, k) => (
                  <span
                    key={k}
                    className="h-1.5 w-6 rounded-full"
                    style={{ background: isToday ? "#2dd4bf" : "rgba(255,255,255,0.14)" }}
                  />
                ))}
              </div>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium ${
                  isToday ? "bg-aurora-teal/20 text-aurora-teal" : "text-white/40 group-hover:text-white/70"
                }`}
                style={isToday ? { border: "1px solid rgba(45,212,191,0.4)" } : undefined}
              >
                {d}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
