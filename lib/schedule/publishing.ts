import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform, hasCapability } from "@/config/platforms";
import { MEDIA } from "@/lib/validations/post";

/**
 * Publishing Adapter — the abstraction every platform implements identically.
 *
 * This is the seam where real platform APIs plug in (Meta Graph, LinkedIn, X,
 * etc. — see `lib/schedule/providers/*`, Integration Sprint 3). Each platform
 * becomes one `PlatformPublisher`, registered once via `registerPublisher`.
 * No platform-specific branching happens anywhere else in the codebase —
 * callers only ever talk to this interface. Platforms without a registered
 * real adapter (or a connection that's still in mock/stub mode from
 * Integration Sprint 2's simulated OAuth) fall back to the original
 * deterministic stub, so scheduling, queues, status transitions, retries,
 * validation and previews all still behave like production either way.
 */

/** A stable taxonomy every provider maps its own error shapes onto — lets the UI and retry engine react consistently regardless of which platform failed. */
export type PublishErrorCode =
  | "no_connection"
  | "expired_token"
  | "permission_denied"
  | "media_too_large"
  | "invalid_media_type"
  | "invalid_caption"
  | "rate_limited"
  | "network_error"
  | "api_error";

/** Errors in this set describe a state a blind retry can't fix — surfaced separately so the retry engine doesn't keep re-attempting a doomed publish. */
export const NON_RETRYABLE_ERRORS: ReadonlySet<PublishErrorCode> = new Set([
  "no_connection", "expired_token", "permission_denied", "media_too_large", "invalid_media_type", "invalid_caption",
]);

export interface PublishResult {
  ok: boolean;
  /** Provider post id / permalink when ok. */
  externalId?: string;
  error?: string;
  errorCode?: PublishErrorCode;
  /** Raw API response summary for the activity log — never shown to the user directly (may contain internal provider structure). */
  responseMeta?: Record<string, unknown>;
}

/**
 * Maps an HTTP status (+ optionally the parsed error body) from any of the
 * providers onto the shared taxonomy above. Status codes are reasonably
 * standardized across Meta/LinkedIn/X's REST APIs for the auth/permission/
 * rate-limit cases; anything a provider recognizes more specifically (e.g. a
 * platform-specific "video too long" code) should override this with its own
 * classification — this is the sane default, not the only source of truth.
 */
export function classifyHttpError(status: number, bodyText?: string): PublishErrorCode {
  if (status === 401) return "expired_token";
  if (status === 403) return "permission_denied";
  if (status === 429) return "rate_limited";
  if (status === 413) return "media_too_large";
  if (status >= 500) return "network_error";
  const t = (bodyText ?? "").toLowerCase();
  if (t.includes("too large") || t.includes("file size")) return "media_too_large";
  if (t.includes("media type") || t.includes("unsupported") || t.includes("format")) return "invalid_media_type";
  if (t.includes("caption") || t.includes("text") || t.includes("character")) return "invalid_caption";
  if (t.includes("token") || t.includes("auth")) return "expired_token";
  if (t.includes("permission") || t.includes("scope")) return "permission_denied";
  return "api_error";
}

/**
 * Pre-flight media check every provider should run before spending a real
 * API call — the size limits real uploads would fail on regardless of
 * platform. `PostMedia` doesn't carry a MIME type today, so format
 * rejections (Phase 10's "Invalid Media Type") stay the platform API
 * response's job for now, not guessed at here. Platform-specific limits
 * (Instagram's exact video length cap, etc.) are likewise the API's own
 * backstop, not duplicated into this generic check.
 */
export function validateMediaForPublish(sp: ScheduledEvent): ValidationResult {
  const errors: string[] = [];
  for (const m of sp.post?.media ?? []) {
    const limit = m.type === "video" ? MEDIA.maxVideoBytes : MEDIA.maxImageBytes;
    if (m.size > limit) errors.push(`${m.name} is too large (max ${Math.round(limit / (1024 * 1024))}MB for ${m.type}).`);
  }
  return { ok: errors.length === 0, errors };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface PublishPreview {
  charCount: number;
  mediaCount: number;
  /** e.g. "Will publish as a Reel", "Exceeds character limit". */
  notes: string[];
}

export interface PlatformPublisher {
  platform: string;
  /** Publish immediately. */
  publish(sp: ScheduledEvent): Promise<PublishResult>;
  /** Hand off to the platform's own native scheduler, when it has one. */
  schedule(sp: ScheduledEvent): Promise<PublishResult>;
  /** Edit an already-published post. */
  update(externalId: string, sp: ScheduledEvent): Promise<PublishResult>;
  /** Remove an already-published post. */
  delete(externalId: string): Promise<PublishResult>;
  /** Pre-flight checks (content + capability), before spending an API call. */
  validate(sp: ScheduledEvent): ValidationResult;
  /** What this will look like once published — no network call. */
  preview(sp: ScheduledEvent): PublishPreview;
}

function baseValidate(sp: ScheduledEvent): ValidationResult {
  const errors: string[] = [];
  if (!getPlatform(sp.platform)) errors.push(`Unknown platform "${sp.platform}".`);
  if (!sp.post_id || !sp.post) errors.push("No post attached.");
  if (sp.post && !sp.post.content.trim() && sp.post.media.length === 0) errors.push("Post has no content or media.");
  if (sp.post?.media.length && !hasCapability(sp.platform, "image") && !hasCapability(sp.platform, "video")) {
    errors.push(`${getPlatform(sp.platform)?.name ?? sp.platform} doesn't support media on this post type.`);
  }
  return { ok: errors.length === 0, errors };
}

/** The default stub adapter — validates inputs and "succeeds", never touches the network. */
const stubPublisher: PlatformPublisher = {
  platform: "*",
  async publish(sp) {
    const v = baseValidate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };
    // Real API call goes here. Deterministic success keeps the engine testable.
    return { ok: true, externalId: `stub_${sp.platform}_${sp.id.slice(0, 8)}` };
  },
  async schedule(sp) {
    return this.publish(sp);
  },
  async update(externalId, sp) {
    const v = baseValidate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };
    return { ok: true, externalId };
  },
  async delete(externalId) {
    return { ok: true, externalId };
  },
  validate: baseValidate,
  preview(sp) {
    const notes: string[] = [];
    const platform = getPlatform(sp.platform);
    if (platform && sp.post) {
      if (sp.post.media.length > 1 && hasCapability(sp.platform, "carousel")) notes.push("Will publish as a carousel.");
      if (sp.post.media.some((m) => m.type === "video") && hasCapability(sp.platform, "reel")) notes.push("Video may be eligible for Reels-style placement.");
    }
    return { charCount: sp.post?.content.length ?? 0, mediaCount: sp.post?.media.length ?? 0, notes };
  },
};

/** Registry of platform publishers. Real ones register here in a later sprint. */
const registry = new Map<string, PlatformPublisher>();

export function registerPublisher(p: PlatformPublisher): void {
  registry.set(p.platform, p);
}

export function getPublisher(platform: string): PlatformPublisher {
  return registry.get(platform) ?? stubPublisher;
}

/** Publish a scheduled post through its platform's registered adapter (falls back to the deterministic stub for any platform without a real one registered, or a connection that's still in Integration Sprint 2's mock OAuth mode). */
export async function publishScheduledPost(sp: ScheduledEvent): Promise<PublishResult> {
  try {
    return await getPublisher(sp.platform).publish(sp);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Publishing failed." };
  }
}

/** Validate a scheduled post against its platform adapter without calling the network. */
export function validateScheduledPost(sp: ScheduledEvent): ValidationResult {
  return getPublisher(sp.platform).validate(sp);
}

/** Preview what a scheduled post will look like once published. */
export function previewScheduledPost(sp: ScheduledEvent): PublishPreview {
  return getPublisher(sp.platform).preview(sp);
}
