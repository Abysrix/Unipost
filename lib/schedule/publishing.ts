import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform, hasCapability } from "@/config/platforms";

/**
 * Publishing Adapter — the abstraction every platform implements identically.
 *
 * This is the seam where real platform APIs plug in (Meta Graph, YouTube Data,
 * LinkedIn, X, etc.). Each platform becomes one `PlatformPublisher`, registered
 * once via `registerPublisher`. No platform-specific branching happens anywhere
 * else in the codebase — callers only ever talk to this interface. For now the
 * engine is fully wired end-to-end against a deterministic stub, so scheduling,
 * queues, status transitions, retries, validation and previews all behave like
 * production before a single real API call exists.
 */

export interface PublishResult {
  ok: boolean;
  /** Provider post id / permalink when ok. */
  externalId?: string;
  error?: string;
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

/** Publish a scheduled post through its platform adapter (stub for now). */
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
