import type { PlatformPublisher, PublishResult, ValidationResult } from "../publishing";
import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform } from "@/config/platforms";
import { validateMediaForPublish } from "../publishing";
import { resolveAuth, resolveAuthForPlatform, listManagedPages, fetchJson, stubPublishResult } from "./shared";

/**
 * Facebook Pages API.
 *
 * Like Instagram, publishing happens through a Page, not the user directly —
 * `connected_accounts.account_id` for a Facebook connection is the Facebook
 * *user* id, so every publish call re-derives the Page + its own access
 * token via `/me/accounts` (`listManagedPages`). Defaults to the first Page
 * the user manages; there's no per-connection "which Page" picker yet
 * (documented limitation, same shape as `getDefaultAccountId` picking a
 * single default connected account per platform).
 */

const GRAPH = "https://graph.facebook.com/v19.0";

function baseValidate(sp: ScheduledEvent): ValidationResult {
  const errors: string[] = [];
  if (!getPlatform(sp.platform)) errors.push(`Unknown platform "${sp.platform}".`);
  if (!sp.post_id || !sp.post) errors.push("No post attached.");
  if (sp.post && !sp.post.content.trim() && sp.post.media.length === 0) errors.push("Post has no content or media.");
  if (sp.post) {
    const hasVideo = sp.post.media.some((m) => m.type === "video");
    if (hasVideo && sp.post.media.length > 1) errors.push("Facebook allows only one video per post, with no other attachments.");
  }
  errors.push(...validateMediaForPublish(sp).errors);
  return { ok: errors.length === 0, errors };
}

async function findFirstPage(userAccessToken: string) {
  const listed = await listManagedPages(userAccessToken);
  if ("result" in listed) return listed;
  const page = listed.pages[0];
  if (!page) return { result: { ok: false, error: "No Facebook Page found. Connect (or create) a Page to publish through.", errorCode: "no_connection" as const } };
  return { page };
}

export const facebookPublisher: PlatformPublisher = {
  platform: "facebook",

  async publish(sp: ScheduledEvent): Promise<PublishResult> {
    const v = this.validate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };

    const resolved = await resolveAuth(sp);
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return stubPublishResult(sp);

    const pageLookup = await findFirstPage(resolved.auth.accessToken);
    if ("result" in pageLookup) return pageLookup.result;
    const { id: pageId, access_token: pageToken } = pageLookup.page;

    const media = sp.post!.media;
    const message = sp.post!.content ?? "";

    try {
      if (media.length === 0) {
        const res = await fetchJson(`${GRAPH}/${pageId}/feed`, { method: "POST", body: new URLSearchParams({ message, access_token: pageToken }) });
        if (!res.ok) return res.result;
        const id = (res.data as { id?: string } | null)?.id;
        if (!id) return { ok: false, error: "Facebook didn't return a post id.", errorCode: "api_error" };
        return { ok: true, externalId: id, responseMeta: { pageId } };
      }

      if (media.length === 1) {
        const m = media[0];
        const endpoint = m.type === "video" ? "videos" : "photos";
        const params = m.type === "video"
          ? new URLSearchParams({ file_url: m.url, description: message, access_token: pageToken })
          : new URLSearchParams({ url: m.url, caption: message, access_token: pageToken });
        const res = await fetchJson(`${GRAPH}/${pageId}/${endpoint}`, { method: "POST", body: params });
        if (!res.ok) return res.result;
        const id = (res.data as { id?: string; post_id?: string } | null);
        const externalId = id?.post_id ?? id?.id;
        if (!externalId) return { ok: false, error: "Facebook didn't return a post id.", errorCode: "api_error" };
        return { ok: true, externalId, responseMeta: { pageId } };
      }

      // Multiple photos: upload each unpublished (published=false gives back a media_fbid without creating a standalone post), then attach them all to one feed post.
      const mediaFbids: string[] = [];
      for (const m of media) {
        const res = await fetchJson(`${GRAPH}/${pageId}/photos`, { method: "POST", body: new URLSearchParams({ url: m.url, published: "false", access_token: pageToken }) });
        if (!res.ok) return res.result;
        const id = (res.data as { id?: string } | null)?.id;
        if (!id) return { ok: false, error: "Facebook didn't return a media id for one of the photos.", errorCode: "api_error" };
        mediaFbids.push(id);
      }
      const attachedMedia = mediaFbids.map((id) => ({ media_fbid: id }));
      const feedRes = await fetchJson(`${GRAPH}/${pageId}/feed`, { method: "POST", body: new URLSearchParams({ message, attached_media: JSON.stringify(attachedMedia), access_token: pageToken }) });
      if (!feedRes.ok) return feedRes.result;
      const feedId = (feedRes.data as { id?: string } | null)?.id;
      if (!feedId) return { ok: false, error: "Facebook didn't return a post id.", errorCode: "api_error" };
      return { ok: true, externalId: feedId, responseMeta: { pageId, mediaFbids } };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Internal Facebook publisher error.", errorCode: "api_error" };
    }
  },

  async schedule(sp: ScheduledEvent) {
    // Facebook's Page feed API does support a native `scheduled_publish_time`, but that would bypass UniPost's own queue/retry/status tracking for the interval in between — publishing through the same queue-driven `publish` path keeps one source of truth for "did this actually go out."
    return this.publish(sp);
  },

  async update(externalId: string, sp: ScheduledEvent) {
    const resolved = await resolveAuth(sp);
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return { ok: true, externalId };
    const pageLookup = await findFirstPage(resolved.auth.accessToken);
    if ("result" in pageLookup) return pageLookup.result;
    const res = await fetchJson(`${GRAPH}/${externalId}`, { method: "POST", body: new URLSearchParams({ message: sp.post?.content ?? "", access_token: pageLookup.page.access_token }) });
    if (!res.ok) return res.result;
    return { ok: true, externalId };
  },

  async delete(externalId: string) {
    const resolved = await resolveAuthForPlatform("facebook");
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return { ok: true, externalId };
    const pageLookup = await findFirstPage(resolved.auth.accessToken);
    if ("result" in pageLookup) return pageLookup.result;
    const res = await fetchJson(`${GRAPH}/${externalId}?access_token=${encodeURIComponent(pageLookup.page.access_token)}`, { method: "DELETE" });
    if (!res.ok) return res.result;
    return { ok: true, externalId };
  },

  validate: baseValidate,

  preview(sp: ScheduledEvent) {
    const notes: string[] = [];
    if (sp.post) {
      if (sp.post.media.length > 1) notes.push("Will publish as a multi-photo post.");
      else if (sp.post.media.some((m) => m.type === "video")) notes.push("Will publish as a native video post.");
    }
    return { charCount: sp.post?.content.length ?? 0, mediaCount: sp.post?.media.length ?? 0, notes };
  },
};
