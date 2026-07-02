/**
 * PLATFORM REGISTRY — the social platforms UniPost publishes to.
 * Drives PlatformBadge, connection cards, scheduler lanes, and analytics.
 * Add a platform here, never inline in a component.
 */

export type PlatformId =
  | "instagram"
  | "youtube"
  | "linkedin"
  | "x"
  | "facebook"
  | "threads";

export type Platform = {
  id: PlatformId;
  name: string;
  /** Brand color — used only where context requires (badges, lanes, chips). */
  color: string;
  /** Short glyph fallback (no icon dependency at token level). */
  glyph: string;
};

export const platforms: Platform[] = [
  { id: "instagram", name: "Instagram", color: "#e1306c", glyph: "◎" },
  { id: "youtube", name: "YouTube", color: "#ff0033", glyph: "▶" },
  { id: "linkedin", name: "LinkedIn", color: "#0a66c2", glyph: "in" },
  { id: "x", name: "X", color: "#e7e9ea", glyph: "𝕏" },
  { id: "facebook", name: "Facebook", color: "#1877f2", glyph: "f" },
  { id: "threads", name: "Threads", color: "#a1a1aa", glyph: "@" },
];

export function getPlatform(id: PlatformId): Platform | undefined {
  return platforms.find((p) => p.id === id);
}
