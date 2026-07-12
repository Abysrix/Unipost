import type { PlatformPublisher, PublishResult, ValidationResult } from "../publishing";
import type { ScheduledEvent } from "@/types/schedule";
import { getPlatform } from "@/config/platforms";
import { validateMediaForPublish } from "../publishing";
import { resolveAuth, resolveAuthForPlatform, listManagedPages, fetchJson, stubPublishResult, type ManagedPage } from "./shared";

/**
 * Instagram Graph API — Content Publishing.
 *
 * Instagram has no publishing endpoint of its own: everything goes through
 * the Facebook Page the Instagram Business/Creator account is linked to,
 * using that Page's own access token (not the user token that authenticated
 * the connection). `connected_accounts.account_id` for an Instagram
 * connection is the Facebook *user* id (see `lib/integrations/providers.ts`'s
 * `profileUrl` for instagram — it hits `/me`, a user-level endpoint), so
 * every publish call first re-derives the linked Page + IG Business Account
 * id via `/me/accounts` (`listManagedPages`) rather than trusting anything
 * cached at connect time.
 */

const GRAPH = "https://graph.facebook.com/v19.0";
const CAPTION_MAX = 2200;

type IgPage = ManagedPage & { instagram_business_account: { id: string } };

function baseValidate(sp: ScheduledEvent): ValidationResult {
  const errors: string[] = [];
  if (!getPlatform(sp.platform)) errors.push(`Unknown platform "${sp.platform}".`);
  if (!sp.post_id || !sp.post) errors.push("No post attached.");
  if (sp.post && !sp.post.content.trim() && sp.post.media.length === 0) errors.push("Post has no content or media.");
  if (sp.post && sp.post.media.length === 0) errors.push("Instagram requires at least one image or video.");
  if (sp.post && sp.post.content.length > CAPTION_MAX) errors.push(`Caption exceeds Instagram's ${CAPTION_MAX}-character limit (currently ${sp.post.content.length}).`);
  if (sp.post && sp.post.media.length > 10) errors.push("Instagram carousels support at most 10 items.");
  errors.push(...validateMediaForPublish(sp).errors);
  return { ok: errors.length === 0, errors };
}

async function findInstagramPage(userAccessToken: string): Promise<{ page: IgPage } | { result: PublishResult }> {
  const listed = await listManagedPages(userAccessToken);
  if ("result" in listed) return listed;
  const withIg = listed.pages.find((p): p is IgPage => Boolean(p.instagram_business_account?.id));
  if (!withIg) {
    return { result: { ok: false, error: "No Instagram Business/Creator account found on any Facebook Page you manage. Link one in Meta Business Suite, then reconnect.", errorCode: "no_connection" } };
  }
  return { page: withIg };
}

/** Container-based publishing (image, video, or carousel) requires waiting for Instagram to finish fetching/transcoding the media before /media_publish will accept it. */
async function waitForContainerReady(containerId: string, accessToken: string): Promise<{ ready: true } | { result: PublishResult }> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const res = await fetchJson(`${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`, { method: "GET" });
    if (!res.ok) return { result: res.result };
    const status = (res.data as { status_code?: string } | null)?.status_code;
    if (status === "FINISHED") return { ready: true };
    if (status === "ERROR" || status === "EXPIRED") {
      return { result: { ok: false, error: `Instagram couldn't process this media (${status}).`, errorCode: "invalid_media_type" } };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { result: { ok: false, error: "Instagram media processing timed out. Try again.", errorCode: "network_error" } };
}

async function createContainer(igUserId: string, params: URLSearchParams): Promise<{ containerId: string } | { result: PublishResult }> {
  const res = await fetchJson(`${GRAPH}/${igUserId}/media`, { method: "POST", body: params });
  if (!res.ok) return { result: res.result };
  const id = (res.data as { id?: string } | null)?.id;
  if (!id) return { result: { ok: false, error: "Instagram didn't return a media container id.", errorCode: "api_error" } };
  return { containerId: id };
}

export const instagramPublisher: PlatformPublisher = {
  platform: "instagram",

  async publish(sp: ScheduledEvent): Promise<PublishResult> {
    const v = this.validate(sp);
    if (!v.ok) return { ok: false, error: v.errors[0] };

    const resolved = await resolveAuth(sp);
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return stubPublishResult(sp);

    const pageLookup = await findInstagramPage(resolved.auth.accessToken);
    if ("result" in pageLookup) return pageLookup.result;
    const igUserId = pageLookup.page.instagram_business_account.id;
    const pageToken = pageLookup.page.access_token;

    const media = sp.post!.media;
    const caption = sp.post!.content ?? "";

    try {
      let containerId: string;

      if (media.length > 1) {
        // Carousel: create each child container first (no caption on children — Instagram rejects it), then a CAROUSEL parent that references them.
        const childIds: string[] = [];
        for (const m of media) {
          const childParams = new URLSearchParams({ is_carousel_item: "true", access_token: pageToken });
          childParams.set(m.type === "video" ? "video_url" : "image_url", m.url);
          const child = await createContainer(igUserId, childParams);
          if ("result" in child) return child.result;
          const ready = await waitForContainerReady(child.containerId, pageToken);
          if ("result" in ready) return ready.result;
          childIds.push(child.containerId);
        }
        const parent = await createContainer(igUserId, new URLSearchParams({ media_type: "CAROUSEL", caption, children: childIds.join(","), access_token: pageToken }));
        if ("result" in parent) return parent.result;
        containerId = parent.containerId;
      } else {
        const m = media[0];
        const params = new URLSearchParams({ caption, access_token: pageToken });
        params.set(m.type === "video" ? "video_url" : "image_url", m.url);
        if (m.type === "video") params.set("media_type", "REELS"); // Feed video posts were retired in favor of Reels.
        const created = await createContainer(igUserId, params);
        if ("result" in created) return created.result;
        containerId = created.containerId;
      }

      const ready = await waitForContainerReady(containerId, pageToken);
      if ("result" in ready) return ready.result;

      const publishRes = await fetchJson(`${GRAPH}/${igUserId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: containerId, access_token: pageToken }) });
      if (!publishRes.ok) return publishRes.result;
      const publishedId = (publishRes.data as { id?: string } | null)?.id;
      if (!publishedId) return { ok: false, error: "Instagram didn't return a published media id.", errorCode: "api_error" };

      // `platform_post_id` stays the real Graph API media id (what analytics
      // sync will need later) — the public instagram.com/p/{shortcode} link
      // isn't derivable from that id, so fetch it separately for the
      // activity log. Best-effort: a failure here shouldn't fail the publish
      // that already succeeded.
      let permalink: string | undefined;
      const permalinkRes = await fetchJson(`${GRAPH}/${publishedId}?fields=permalink&access_token=${encodeURIComponent(pageToken)}`, { method: "GET" });
      if (permalinkRes.ok) permalink = (permalinkRes.data as { permalink?: string } | null)?.permalink;

      return { ok: true, externalId: publishedId, responseMeta: { igUserId, containerId, ...(permalink ? { permalink } : {}) } };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Internal Instagram publisher error.", errorCode: "api_error" };
    }
  },

  async schedule(sp: ScheduledEvent) {
    // No native future-scheduling for organic Instagram posts — UniPost's own scheduler queue (interactive "Publish now" or the cron worker) triggers `publish` at the right time instead.
    return this.publish(sp);
  },

  async update() {
    return { ok: false, error: "Instagram does not support editing a published post's media or caption via API.", errorCode: "api_error" };
  },

  async delete(externalId: string) {
    // No accountId parameter is supplied by the PlatformPublisher interface (see youtube.ts for the same constraint) — resolves against the platform's current default account.
    const resolved = await resolveAuthForPlatform("instagram");
    if ("result" in resolved) return resolved.result;
    if (resolved.auth.isStub) return { ok: true, externalId };
    const pageLookup = await findInstagramPage(resolved.auth.accessToken);
    if ("result" in pageLookup) return pageLookup.result;
    const res = await fetchJson(`${GRAPH}/${externalId}?access_token=${encodeURIComponent(pageLookup.page.access_token)}`, { method: "DELETE" });
    if (!res.ok) return res.result;
    return { ok: true, externalId };
  },

  validate: baseValidate,

  preview(sp: ScheduledEvent) {
    const notes: string[] = [];
    if (sp.post) {
      if (sp.post.media.length > 1) notes.push("Will publish as a carousel.");
      else if (sp.post.media.some((m) => m.type === "video")) notes.push("Will publish as a Reel.");
      if (sp.post.content.length > CAPTION_MAX) notes.push(`Exceeds Instagram's ${CAPTION_MAX}-character caption limit.`);
    }
    return { charCount: sp.post?.content.length ?? 0, mediaCount: sp.post?.media.length ?? 0, notes };
  },
};
