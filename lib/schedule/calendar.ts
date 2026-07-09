/**
 * Pure calendar date math. Operates in the browser's LOCAL timezone: the grid is
 * rendered locally while the DB stores UTC. No external date library.
 */

export const DAY_MS = 86_400_000;
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -x.getDay()); // week starts Sunday
}

/** 6×7 grid of days covering the month of `d` (leading/trailing days included). */
export function monthMatrix(d: Date): Date[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** The 7 days of the week containing `d`. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Hours 0–23 for time-grid rows. */
export const HOURS: number[] = Array.from({ length: 24 }, (_, i) => i);

/** e.g. "2 pm", "12 am". */
export function hourLabel(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

/** e.g. "2:30 pm". */
export function timeLabel(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** Minutes from local midnight (for positioning in the time grid). */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Rebuild an instant on a new calendar date, keeping the original time-of-day. */
export function moveToDate(instant: Date, target: Date): Date {
  const x = new Date(target);
  x.setHours(instant.getHours(), instant.getMinutes(), 0, 0);
  return x;
}

/** Rebuild an instant at a new hour (and optional minute) on the same date. */
export function moveToHour(instant: Date, hour: number, minute = instant.getMinutes()): Date {
  const x = new Date(instant);
  x.setHours(hour, minute, 0, 0);
  return x;
}

export function monthTitle(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}
export function dayTitle(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function weekTitle(d: Date): string {
  const days = weekDays(d);
  const a = days[0];
  const b = days[6];
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const right = b.toLocaleDateString("en-IN", sameMonth ? { day: "numeric", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
  return `${left} – ${right}`;
}

/** For date/time `<input>` values (local). */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function toTimeInputValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${mi}`;
}
