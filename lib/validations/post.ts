import { z } from "zod";
import type { PlatformId } from "@/config/platforms";
import type { PostMedia } from "@/types/post";

/** Per-platform composing limits (advisory in the studio; enforced at publish, later). */
export const PLATFORM_LIMITS: Record<PlatformId, { chars: number; media: number }> = {
  instagram: { chars: 2200, media: 10 },
  youtube: { chars: 5000, media: 1 },
  linkedin: { chars: 3000, media: 9 },
  x: { chars: 280, media: 4 },
  facebook: { chars: 63206, media: 10 },
  threads: { chars: 500, media: 10 },
};

/** Media upload constraints. */
export const MEDIA = {
  maxPerPost: 10,
  maxImageBytes: 10 * 1024 * 1024, // 10 MB
  maxVideoBytes: 200 * 1024 * 1024, // 200 MB
  imageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  videoTypes: ["video/mp4", "video/quicktime", "video/webm"],
} as const;

export const mediaItemSchema = z.object({
  path: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  name: z.string(),
  size: z.number().nonnegative(),
});

/** What the studio persists. Kept permissive — a draft may be empty. */
export const postInputSchema = z.object({
  title: z.string().max(200, "Title is too long").default(""),
  content: z.string().max(100_000).default(""),
  platforms: z.array(z.string()).max(6).default([]),
  media: z.array(mediaItemSchema).max(MEDIA.maxPerPost, "Too many attachments").default([]),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
});
export type PostInputParsed = z.infer<typeof postInputSchema>;

export type PlatformValidation = {
  platform: PlatformId;
  chars: number;
  limit: number;
  over: number;
  mediaOver: number;
  ok: boolean;
};

/** Advisory per-platform validation for the current content + media selection. */
export function validateForPlatforms(
  content: string,
  media: PostMedia[],
  platforms: PlatformId[]
): PlatformValidation[] {
  const chars = content.length;
  return platforms.map((p) => {
    const { chars: limit, media: mediaLimit } = PLATFORM_LIMITS[p];
    const over = Math.max(0, chars - limit);
    const mediaOver = Math.max(0, media.length - mediaLimit);
    return { platform: p, chars, limit, over, mediaOver, ok: over === 0 && mediaOver === 0 };
  });
}

/** The strictest character limit across the selected platforms (for the counter). */
export function tightestLimit(platforms: PlatformId[]): number | null {
  if (!platforms.length) return null;
  return Math.min(...platforms.map((p) => PLATFORM_LIMITS[p].chars));
}

/** Validate a single file before upload. Returns an error string or null. */
export function validateFile(file: File): string | null {
  const isImage = (MEDIA.imageTypes as readonly string[]).includes(file.type);
  const isVideo = (MEDIA.videoTypes as readonly string[]).includes(file.type);
  if (!isImage && !isVideo) return "Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, MOV or WEBM.";
  if (isImage && file.size > MEDIA.maxImageBytes) return "Image is over 10 MB.";
  if (isVideo && file.size > MEDIA.maxVideoBytes) return "Video is over 200 MB.";
  return null;
}
