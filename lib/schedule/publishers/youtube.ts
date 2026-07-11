import type { PlatformPublisher, PublishResult, ValidationResult } from "../publishing";
import type { ScheduledEvent } from "@/types/schedule";
import { getValidAccessToken, getDefaultAccountId } from "@/lib/db/integrations";
import { getPlatform, hasCapability } from "@/config/platforms";

export const youtubePublisher: PlatformPublisher = {
  platform: "youtube",

  async publish(sp: ScheduledEvent): Promise<PublishResult> {
    const v = this.validate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };

    let accountId = sp.connected_account_id;
    if (!accountId) {
      accountId = await getDefaultAccountId("youtube", sp.user_id);
    }

    if (!accountId) {
      return { ok: false, error: "No channel connection selected for this schedule." };
    }

    const accessToken = await getValidAccessToken(accountId);
    if (!accessToken) {
      return { ok: false, error: "Could not retrieve valid access token for YouTube channel." };
    }

    const mediaItem = sp.post?.media.find((m) => m.type === "video");
    if (!mediaItem) {
      return { ok: false, error: "YouTube publishing requires a video attachment." };
    }

    try {
      // 1. Download video binary from storage
      const fileRes = await fetch(mediaItem.url);
      if (!fileRes.ok) {
        return { ok: false, error: "Failed to download video attachment from storage." };
      }
      
      let mimeType = fileRes.headers.get("content-type") || "";
      if (!mimeType || mimeType === "application/octet-stream" || mimeType.startsWith("text/")) {
        const ext = mediaItem.name.split(".").pop()?.toLowerCase();
        if (ext === "mov") mimeType = "video/quicktime";
        else if (ext === "avi") mimeType = "video/x-msvideo";
        else if (ext === "webm") mimeType = "video/webm";
        else if (ext === "mkv") mimeType = "video/x-matroska";
        else mimeType = "video/mp4";
      }

      const videoBlob = await fileRes.blob();

      // 2. Determine if this is a future-scheduled post — use YouTube's native scheduling
      const scheduledAt = sp.scheduled_time ? new Date(sp.scheduled_time) : null;
      const isFuture = scheduledAt && scheduledAt.getTime() > Date.now() + 60_000; // >1 min in future

      const statusBlock = isFuture
        ? {
            privacyStatus: "private", // YouTube requires private for scheduled videos
            publishAt: scheduledAt!.toISOString(),
          }
        : {
            privacyStatus: sp.post?.visibility === "private" ? "private"
              : sp.post?.visibility === "unlisted" ? "unlisted"
              : "public",
          };

      // 3. Build multipart body
      const metadata = {
        snippet: {
          title: sp.post?.title || "Video from UniPost",
          description: sp.post?.content || "",
          categoryId: "22", // People & Blogs (default category)
        },
        status: statusBlock,
      };

      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadataPart = 
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata);

      const videoBinary = Buffer.from(await videoBlob.arrayBuffer());

      const bodyParts = [
        Buffer.from(delimiter),
        Buffer.from(metadataPart),
        Buffer.from(delimiter),
        Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
        videoBinary,
        Buffer.from(closeDelimiter)
      ];

      const body = Buffer.concat(bodyParts);

      // 4. Post upload request to Google/YouTube upload API
      const uploadRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": String(body.length),
        },
        body,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `YouTube upload failed with status ${uploadRes.status}`;
        return { ok: false, error: errMsg };
      }

      const uploadJson = await uploadRes.json();
      return { ok: true, externalId: uploadJson.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Internal YouTube publisher error." };
    }
  },

  async schedule(sp: ScheduledEvent) {
    // Upload now with YouTube's native publishAt scheduling — YouTube handles the release
    return this.publish(sp);
  },

  async update(externalId: string, sp: ScheduledEvent) {
    // Editing YouTube video details via API (not re-uploading file)
    let accountId = sp.connected_account_id;
    if (!accountId) {
      accountId = await getDefaultAccountId("youtube", sp.user_id);
    }
    if (!accountId) return { ok: false, error: "No connection selected." };
    const accessToken = await getValidAccessToken(accountId);
    if (!accessToken) return { ok: false, error: "Access token missing." };

    try {
      const updateRes = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: externalId,
          snippet: {
            title: sp.post?.title || "Video from UniPost",
            description: sp.post?.content || "",
            categoryId: "22",
          },
        }),
      });

      if (!updateRes.ok) {
        const errJson = await updateRes.json().catch(() => ({}));
        return { ok: false, error: errJson?.error?.message || "YouTube metadata update failed." };
      }

      return { ok: true, externalId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Metadata update failed." };
    }
  },

  async delete(externalId: string, accountId?: string) {
    if (!accountId) return { ok: true, externalId }; // fallback
    const accessToken = await getValidAccessToken(accountId);
    if (!accessToken) return { ok: false, error: "Access token missing." };

    try {
      const deleteRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${externalId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!deleteRes.ok) {
        const errJson = await deleteRes.json().catch(() => ({}));
        return { ok: false, error: errJson?.error?.message || "YouTube delete failed." };
      }

      return { ok: true, externalId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
    }
  },

  validate(sp: ScheduledEvent): ValidationResult {
    const errors: string[] = [];
    if (!getPlatform(sp.platform)) errors.push(`Unknown platform "${sp.platform}".`);
    if (!sp.post_id || !sp.post) errors.push("No post attached.");
    if (sp.post && !sp.post.content.trim() && sp.post.media.length === 0) errors.push("Post has no content or media.");
    if (!sp.post?.media || !sp.post.media.some((m) => m.type === "video")) {
      errors.push("YouTube publishing requires a video attachment.");
    }
    return { ok: errors.length === 0, errors };
  },

  preview(sp: ScheduledEvent) {
    const notes: string[] = [];
    if (sp.post) {
      if (sp.post.media.some((m) => m.type === "video")) {
        notes.push("Will upload and publish as a public YouTube video.");
      }
    }
    return { charCount: sp.post?.content.length ?? 0, mediaCount: sp.post?.media.length ?? 0, notes };
  },
};

// Auto-register with the central publishing hub in publishing.ts
