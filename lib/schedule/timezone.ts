/**
 * Timezone service. Converts between a wall-clock time in an IANA zone and an
 * absolute UTC instant, using only `Intl` (no date library). India-first.
 */

export interface TimezoneOption {
  id: string; // IANA name
  label: string;
}

/** Curated, India-first zone list for the picker. */
export const COMMON_TIMEZONES: TimezoneOption[] = [
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Dubai", label: "Dubai (GST)" },
  { id: "Asia/Singapore", label: "Singapore (SGT)" },
  { id: "Asia/Tokyo", label: "Tokyo (JST)" },
  { id: "Australia/Sydney", label: "Sydney (AEST)" },
  { id: "Europe/London", label: "London (GMT/BST)" },
  { id: "Europe/Berlin", label: "Berlin (CET)" },
  { id: "America/New_York", label: "New York (ET)" },
  { id: "America/Chicago", label: "Chicago (CT)" },
  { id: "America/Denver", label: "Denver (MT)" },
  { id: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { id: "UTC", label: "UTC" },
];

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** The browser's current IANA zone (falls back to the default). */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Offset (ms) of `tz` at the given UTC instant: wallClock − utc. Handles DST. */
function offsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  // Intl can yield hour "24" at midnight — normalize.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asWall = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asWall - utcMs;
}

/**
 * Convert a wall-clock time in `tz` to a UTC ISO string.
 * e.g. zonedWallTimeToUtcIso("2025-07-10", "14:30", "Asia/Kolkata") → 09:00Z.
 */
export function zonedWallTimeToUtcIso(dateStr: string, timeStr: string, tz: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const guessUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Correct by the zone's offset at that instant (one refinement pass handles DST edges).
  const off = offsetMs(guessUtc, tz);
  return new Date(guessUtc - off).toISOString();
}

/** Format an absolute instant in a given zone. */
export function formatInZone(iso: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, ...opts }).format(new Date(iso));
}

/** The hour-of-day (0-23) an instant falls on in a given zone. */
export function hourInZone(iso: string, tz: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(new Date(iso));
  const n = Number(h);
  return n === 24 ? 0 : n;
}

/** An instant's wall-clock as `<input>` values in a zone, e.g. { date, time }. */
export function zonedInputs(iso: string, tz: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = p.value;
  const hour = m.hour === "24" ? "00" : m.hour;
  return { date: `${m.year}-${m.month}-${m.day}`, time: `${hour}:${m.minute}` };
}

/** Human date+time, e.g. "Thu, 10 Jul 2025, 2:30 pm". */
export function formatDateTime(iso: string, tz?: string): string {
  return formatInZone(iso, tz ?? localTimezone(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Short abbreviation for a zone at an instant, e.g. "GMT+5:30". */
export function zoneAbbr(iso: string, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(iso));
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

/** Compact "in 3 days" / "in 2 hours" / "in 12 min" / "now" / "5 min ago". */
export function relativeTo(iso: string, from = Date.now()): string {
  const diff = new Date(iso).getTime() - from;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);
  let phrase: string;
  if (min < 1) return "now";
  if (min < 60) phrase = `${min} min`;
  else if (hr < 24) phrase = `${hr} hour${hr === 1 ? "" : "s"}`;
  else phrase = `${day} day${day === 1 ? "" : "s"}`;
  return diff >= 0 ? `in ${phrase}` : `${phrase} ago`;
}
