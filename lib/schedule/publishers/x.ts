import type { PlatformPublisher, PublishResult, ValidationResult } from "../publishing";
import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform } from "@/config/platforms";
import { classifyHttpError, validateMediaForPublish } from "../publishing";
import { resolveAuth, resolveAuthForPlatform, fetchJson, stubPublishResult } from "./shared";

/**
 * X (Twitter) API v2 for tweet creation, v1.1 media upload for attachments —
 * v1.1's `media/upload.json` is still the documented endpoint for attaching
 * media to a v2 tweet (it accepts OAuth 2.0 User Context tokens, the same
 * bearer token `resolveAuth` already resolves). Images use v1.1's simple
 * upload; video must use the chunked INIT/APPEND/FINALIZE/STATUS flow —
 * simple upload silently rejects anything over ~5MB, which would make video
 * scheduling look "supported" right up until it quietly failed in production.
 */

const TWEETS_URL = "https://api.twitter.com/2/tweets";
const MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
const MAX_CHARS = 280;
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB — safely under X's 5MB/chunk limit

function baseValidate(sp: ScheduledEvent): ValidationResult {
  const errors: string[] = [];
  if (!getPlatform(sp.platform)) errors.push(`Unknown platform "${sp.platform}".`);
  if (!sp.post_id || !sp.post) errors.push("No post attached.");
  if (sp.post && !sp.post.content.trim() && sp.post.media.length === 0) errors.push("Post has no content or media.");
  if (sp.post && sp.post.content.length > MAX_CHARS) errors.push(`Post exceeds X's ${MAX_CHARS}-character limit (currently ${sp.post.content.length}).`);
  if (sp.post) {
    const hasVideo = sp.post.media.some((m) => m.type === "video");
    if (hasVideo && sp.post.media.length > 1) errors.push("X allows only one video per post, with no other attachments.");
    else if (sp.post.media.length > 4) errors.push("X supports at most 4 images per post.");
  }
  errors.push(...validateMediaForPublish(sp).errors);
  return { ok: errors.length === 0, errors };
}

async function uploadImage(url: string, accessToken: string): Promise<{ mediaId: string } | { result: PublishResult }> {
  const fileRes = await fetch(url);
  if (!fileRes.ok) return { result: { ok: false, error: "Failed to download media attachment from storage.", errorCode: "api_error" } };
  const blob = await fileRes.blob();
  const form = new FormData();
  form.set("media", blob);
  const res = await fetchJson(MEDIA_UPLOAD_URL, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form });
  if (!res.ok) return { result: res.result };
  const mediaId = (res.data as { media_id_string?: string } | null)?.media_id_string;
  if (!mediaId) return { result: { ok: false, error: "X didn't return a media id for an upload.", errorCode: "api_error" } };
  return { mediaId };
}

async function uploadVideoChunked(url: string, accessToken: string): Promise<{ mediaId: string } | { result: PublishResult }> {
  const fileRes = await fetch(url);
  if (!fileRes.ok) return { result: { ok: false, error: "Failed to download video attachment from storage.", errorCode: "api_error" } };
  const mimeType = fileRes.headers.get("content-type") || "video/mp4";
  const buf = Buffer.from(await fileRes.arrayBuffer());

  const initRes = await fetchJson(MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: new URLSearchParams({ command: "INIT", media_type: mimeType, media_category: "tweet_video", total_bytes: String(buf.length) }),
  });
  if (!initRes.ok) return { result: initRes.result };
  const mediaId = (initRes.data as { media_id_string?: string } | null)?.media_id_string;
  if (!mediaId) return { result: { ok: false, error: "X didn't return a media id for video upload.", errorCode: "api_error" } };

  for (let offset = 0, segment = 0; offset < buf.length; offset += CHUNK_SIZE, segment++) {
    const chunk = buf.subarray(offset, offset + CHUNK_SIZE);
    const form = new FormData();
    form.set("command", "APPEND");
    form.set("media_id", mediaId);
    form.set("segment_index", String(segment));
    form.set("media", new Blob([chunk]));
    const appendRes = await fetch(MEDIA_UPLOAD_URL, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form, signal: AbortSignal.timeout(30_000) });
    if (!appendRes.ok) {
      const text = await appendRes.text().catch(() => "");
      return { result: { ok: false, error: `X video upload failed on chunk ${segment}.`, errorCode: classifyHttpError(appendRes.status, text) } };
    }
  }

  const finalizeRes = await fetchJson(MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: new URLSearchParams({ command: "FINALIZE", media_id: mediaId }),
  });
  if (!finalizeRes.ok) return { result: finalizeRes.result };
  let processingInfo = (finalizeRes.data as { processing_info?: { state: string; check_after_secs?: number } } | null)?.processing_info;

  const deadline = Date.now() + 60_000;
  while (processingInfo && (processingInfo.state === "pending" || processingInfo.state === "in_progress")) {
    if (Date.now() > deadline) return { result: { ok: false, error: "X video processing timed out.", errorCode: "network_error" } };
    await new Promise((r) => setTimeout(r, (processingInfo!.check_after_secs ?? 3) * 1000));
    const statusRes = await fetchJson(`${MEDIA_UPLOAD_URL}?command=STATUS&media_id=${encodeURIComponent(mediaId)}`, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } });
    if (!statusRes.ok) return { result: statusRes.result };
    processingInfo = (statusRes.data as { processing_info?: { state: string; check_after_secs?: number } } | null)?.processing_info;
    if (processingInfo?.state === "failed") return { result: { ok: false, error: "X failed to process the uploaded video.", errorCode: "invalid_media_type" } };
  }

  return { mediaId };
}

export const xPublisher: PlatformPublisher = {
  platform: "x",

  async publish(sp: ScheduledEvent): Promise<PublishResult> {
    const v = this.validate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };

    const resolved = await resolveAuth(sp);
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return stubPublishResult(sp);
    const { accessToken } = resolved.auth;

    try {
      const mediaIds: string[] = [];
      for (const m of sp.post!.media) {
        const uploaded = m.type === "video" ? await uploadVideoChunked(m.url, accessToken) : await uploadImage(m.url, accessToken);
        if ("result" in uploaded) return uploaded.result;
        mediaIds.push(uploaded.mediaId);
      }

      const body: Record<string, unknown> = { text: sp.post!.content ?? "" };
      if (mediaIds.length > 0) body.media = { media_ids: mediaIds };

      const res = await fetchJson(TWEETS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return res.result;
      const id = (res.data as { data?: { id?: string } } | null)?.data?.id;
      if (!id) return { ok: false, error: "X didn't return a tweet id.", errorCode: "api_error" };
      return { ok: true, externalId: id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Internal X publisher error.", errorCode: "api_error" };
    }
  },

  async schedule(sp: ScheduledEvent) {
    // No native future-scheduling for a personal account's tweets — UniPost's own scheduler queue handles the timing.
    return this.publish(sp);
  },

  async update() {
    return { ok: false, error: "X does not support editing a published post's text via API.", errorCode: "api_error" };
  },

  async delete(externalId: string) {
    const resolved = await resolveAuthForPlatform("x");
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return { ok: true, externalId };
    const res = await fetchJson(`${TWEETS_URL}/${externalId}`, { method: "DELETE", headers: { Authorization: `Bearer ${resolved.auth.accessToken}` } });
    if (!res.ok) return res.result;
    return { ok: true, externalId };
  },

  validate: baseValidate,

  preview(sp: ScheduledEvent) {
    const notes: string[] = [];
    if (sp.post) {
      if (sp.post.content.length > MAX_CHARS) notes.push(`Exceeds X's ${MAX_CHARS}-character limit.`);
      if (sp.post.media.length > 0) notes.push(`Will attach ${sp.post.media.length} media item${sp.post.media.length > 1 ? "s" : ""}.`);
    }
    return { charCount: sp.post?.content.length ?? 0, mediaCount: sp.post?.media.length ?? 0, notes };
  },
};
