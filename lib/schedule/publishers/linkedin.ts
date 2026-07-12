import type { PlatformPublisher, PublishResult, ValidationResult } from "../publishing";
import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform } from "@/config/platforms";
import { classifyHttpError, validateMediaForPublish } from "../publishing";
import { resolveAuth, resolveAuthForPlatform, fetchJson, stubPublishResult } from "./shared";
import { getAccountExternalId } from "@/lib/db/integrations";

/**
 * LinkedIn UGC Posts API.
 *
 * Every post is authored "as" `urn:li:person:{id}` — `{id}` is the member id
 * LinkedIn's `/v2/userinfo` returned at connect time (`sub` claim), stored as
 * `connected_accounts.account_id`. Unlike Meta, that's already the right id
 * to publish with directly, no Page indirection — `getAccountExternalId`
 * fetches it. Media (image/video) must be uploaded through LinkedIn's own
 * asset-registration flow first; the resulting asset URN is what actually
 * gets attached to the post, not a raw URL.
 */

const ASSETS_URL = "https://api.linkedin.com/v2/assets?action=registerUpload";
const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const RESTLI_HEADERS = { "X-Restli-Protocol-Version": "2.0.0" };

function baseValidate(sp: ScheduledEvent): ValidationResult {
  const errors: string[] = [];
  if (!getPlatform(sp.platform)) errors.push(`Unknown platform "${sp.platform}".`);
  if (!sp.post_id || !sp.post) errors.push("No post attached.");
  if (sp.post && !sp.post.content.trim() && sp.post.media.length === 0) errors.push("Post has no content or media.");
  if (sp.post) {
    const hasVideo = sp.post.media.some((m) => m.type === "video");
    const hasImage = sp.post.media.some((m) => m.type === "image");
    if (hasVideo && hasImage) errors.push("LinkedIn posts can't mix images and video in one post.");
    if (hasVideo && sp.post.media.length > 1) errors.push("LinkedIn allows only one video per post.");
  }
  errors.push(...validateMediaForPublish(sp).errors);
  return { ok: errors.length === 0, errors };
}

async function uploadAsset(mediaUrl: string, mediaType: "image" | "video", authorUrn: string, accessToken: string): Promise<{ asset: string } | { result: PublishResult }> {
  const recipe = mediaType === "video" ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image";
  const registerRes = await fetchJson(ASSETS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...RESTLI_HEADERS },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [recipe],
        owner: authorUrn,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });
  if (!registerRes.ok) return { result: registerRes.result };
  const value = (registerRes.data as { value?: { asset?: string; uploadMechanism?: Record<string, { uploadUrl?: string }> } } | null)?.value;
  const asset = value?.asset;
  const uploadUrl = value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  if (!asset || !uploadUrl) return { result: { ok: false, error: "LinkedIn didn't return an upload target for this media.", errorCode: "api_error" } };

  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) return { result: { ok: false, error: "Failed to download media attachment from storage.", errorCode: "api_error" } };
  const bytes = await fileRes.arrayBuffer();

  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }, body: bytes, signal: AbortSignal.timeout(60_000) });
  if (!putRes.ok) return { result: { ok: false, error: `LinkedIn media upload failed (${putRes.status}).`, errorCode: classifyHttpError(putRes.status) } };
  return { asset };
}

export const linkedinPublisher: PlatformPublisher = {
  platform: "linkedin",

  async publish(sp: ScheduledEvent): Promise<PublishResult> {
    const v = this.validate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };

    const resolved = await resolveAuth(sp);
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return stubPublishResult(sp);
    const { accountId, accessToken } = resolved.auth;

    const externalMemberId = await getAccountExternalId(accountId);
    if (!externalMemberId) return { ok: false, error: "Could not resolve this connection's LinkedIn member id.", errorCode: "no_connection" };
    const authorUrn = `urn:li:person:${externalMemberId}`;

    const media = sp.post!.media;
    const text = sp.post!.content ?? "";

    try {
      let shareMediaCategory: "NONE" | "IMAGE" | "VIDEO" = "NONE";
      const mediaEntries: Array<{ status: string; media: string; title: { text: string } }> = [];

      if (media.length > 0) {
        shareMediaCategory = media[0].type === "video" ? "VIDEO" : "IMAGE";
        for (const m of media) {
          const uploaded = await uploadAsset(m.url, m.type, authorUrn, accessToken);
          if ("result" in uploaded) return uploaded.result;
          mediaEntries.push({ status: "READY", media: uploaded.asset, title: { text: m.name } });
        }
      }

      const body = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory,
            ...(mediaEntries.length > 0 ? { media: mediaEntries } : {}),
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": sp.post?.visibility === "private" ? "CONNECTIONS" : "PUBLIC" },
      };

      const res = await fetchJson(UGC_POSTS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...RESTLI_HEADERS },
        body: JSON.stringify(body),
      });
      if (!res.ok) return res.result;
      // The created post's URN comes back in a response header, not the body.
      const id = res.headers.get("x-restli-id") ?? (res.data as { id?: string } | null)?.id;
      if (!id) return { ok: false, error: "LinkedIn didn't return a post id.", errorCode: "api_error" };
      return { ok: true, externalId: id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Internal LinkedIn publisher error.", errorCode: "api_error" };
    }
  },

  async schedule(sp: ScheduledEvent) {
    // No native future-scheduling for a personal member's UGC posts — UniPost's own scheduler queue handles the timing.
    return this.publish(sp);
  },

  async update() {
    return { ok: false, error: "LinkedIn does not support editing a published post via API.", errorCode: "api_error" };
  },

  async delete(externalId: string) {
    const resolved = await resolveAuthForPlatform("linkedin");
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return { ok: true, externalId };
    const res = await fetchJson(`${UGC_POSTS_URL}/${encodeURIComponent(externalId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${resolved.auth.accessToken}`, ...RESTLI_HEADERS } });
    if (!res.ok) return res.result;
    return { ok: true, externalId };
  },

  validate: baseValidate,

  preview(sp: ScheduledEvent) {
    const notes: string[] = [];
    if (sp.post?.media.some((m) => m.type === "video")) notes.push("Will publish as a native video post.");
    else if ((sp.post?.media.length ?? 0) > 1) notes.push("Will publish as a multi-image post.");
    return { charCount: sp.post?.content.length ?? 0, mediaCount: sp.post?.media.length ?? 0, notes };
  },
};
