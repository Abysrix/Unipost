"use client";

import { Globe } from "lucide-react";
import { COMMON_TIMEZONES, localTimezone } from "@/lib/schedule/timezone";

/** Timezone dropdown. Always includes the visitor's local zone at the top. */
export default function TimezoneSelector({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const local = localTimezone();
  const hasLocal = COMMON_TIMEZONES.some((z) => z.id === local);
  return (
    <label className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 focus-within:border-aurora-teal/40">
      <Globe size={15} className="shrink-0 text-white/40" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Timezone" className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]">
        {!hasLocal && (
          <option value={local} className="bg-bg-secondary">
            {local} (local)
          </option>
        )}
        {COMMON_TIMEZONES.map((z) => (
          <option key={z.id} value={z.id} className="bg-bg-secondary">
            {z.label}
            {z.id === local ? " · local" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
