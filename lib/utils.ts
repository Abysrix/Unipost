import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Format a number with thousands separators (Indian-friendly). */
export function formatNumber(n: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** Compact relative time, e.g. "just now", "3m ago", "2h ago", "Apr 12". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 604800) return `${Math.round(s / 86400)}d ago`;
  return new Date(then).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/** Count words in a string. */
export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Guards a redirect target from sending users off-site. `//evil.com` passes
 * a naive `startsWith("/")` check (browsers resolve protocol-relative URLs
 * against the current scheme) — reject those too, not just `http(s)://`.
 * Also reject any backslash: WHATWG URL parsing (every browser, and Next's
 * own client router when resolving a Server Action's redirect) normalizes a
 * leading `/\` the same as `//`, so `/\evil.com` is an equally valid
 * protocol-relative bypass that a plain `//` check misses.
 */
export function isSafeRedirect(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

/** The house easing curves, as cubic-bezier arrays (Framer-ready). */
export const EASES = {
  expo: [0.16, 1, 0.3, 1],
  quart: [0.76, 0, 0.24, 1],
  back: [0.34, 1.56, 0.64, 1],
  soft: [0.25, 0.8, 0.25, 1],
} as const;

export const DURATIONS = {
  fast: 0.45,
  base: 0.7,
  slow: 1.0,
  cinematic: 1.4,
} as const;
