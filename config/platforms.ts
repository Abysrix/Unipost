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

/**
 * What a platform can publish. Code that needs to know "can I do X here" queries
 * this registry (`hasCapability`) — never a scattered `if (platform === "...")`.
 */
export type Capability =
  | "post" | "image" | "video" | "carousel"
  | "reel" | "story" | "article" | "thread" | "community_post" | "short";

export const CAPABILITY_LABELS: Record<Capability, string> = {
  post: "Posts",
  image: "Images",
  video: "Video",
  carousel: "Carousels",
  reel: "Reels",
  story: "Stories",
  article: "Articles",
  thread: "Threads",
  community_post: "Community posts",
  short: "Shorts",
};

export type Platform = {
  id: PlatformId;
  name: string;
  /** Brand color — used only where context requires (badges, lanes, chips). */
  color: string;
  /** Short glyph fallback (no icon dependency at token level). */
  glyph: string;
  /** What this platform can publish (Sprint 7 capability system). */
  capabilities: Capability[];
};

export const platforms: Platform[] = [
  { id: "instagram", name: "Instagram", color: "#e1306c", glyph: "◎", capabilities: ["post", "image", "video", "carousel", "reel", "story"] },
  { id: "youtube", name: "YouTube", color: "#ff0033", glyph: "▶", capabilities: ["video", "short", "community_post"] },
  { id: "linkedin", name: "LinkedIn", color: "#0a66c2", glyph: "in", capabilities: ["post", "image", "video", "article"] },
  { id: "x", name: "X", color: "#e7e9ea", glyph: "𝕏", capabilities: ["post", "image", "video", "thread"] },
  { id: "facebook", name: "Facebook", color: "#1877f2", glyph: "f", capabilities: ["post", "image", "video", "carousel", "story"] },
  { id: "threads", name: "Threads", color: "#a1a1aa", glyph: "@", capabilities: ["post", "image", "video", "thread"] },
];

/** Platforms visible in the integrations hub but not yet connectable. */
export interface FuturePlatform {
  id: string;
  name: string;
  color: string;
  glyph: string;
}
export const FUTURE_PLATFORMS: FuturePlatform[] = [
  { id: "tiktok", name: "TikTok", color: "#25f4ee", glyph: "♪" },
  { id: "pinterest", name: "Pinterest", color: "#e60023", glyph: "P" },
];

export function getPlatform(id: PlatformId): Platform | undefined {
  return platforms.find((p) => p.id === id);
}

export function hasCapability(id: PlatformId, capability: Capability): boolean {
  return getPlatform(id)?.capabilities.includes(capability) ?? false;
}

export function platformsWithCapability(capability: Capability): Platform[] {
  return platforms.filter((p) => p.capabilities.includes(capability));
}
