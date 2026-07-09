/* eslint-disable @next/next/no-img-element */
import { getPlatform, type PlatformId } from "@/config/platforms";
import type { PostMedia } from "@/types/post";

/**
 * ContentCard — a lightweight preview of how the post reads on a given platform.
 * Presentational; the studio swaps `platform` via the preview toggle.
 */
export default function ContentCard({
  platform,
  authorName,
  title,
  content,
  media,
}: {
  platform: PlatformId;
  authorName: string;
  title: string;
  content: string;
  media: PostMedia[];
}) {
  const p = getPlatform(platform);
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-bg-secondary">
      <div className="flex items-center gap-2.5 p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: `${p?.color}26`, color: p?.color }}>
          {authorName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">{authorName}</div>
          <div className="flex items-center gap-1 text-[10px] text-white/35">
            <span style={{ color: p?.color }}>{p?.glyph}</span> {p?.name} · now
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        {title && <div className="mb-1 text-[13px] font-semibold text-white">{title}</div>}
        {content ? (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/75">{content}</p>
        ) : (
          <p className="text-[13px] italic text-white/25">Your post preview will appear here…</p>
        )}
      </div>

      {media.length > 0 && (
        <div className={`grid gap-0.5 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {media.slice(0, 4).map((m) =>
            m.type === "image" ? (
              <img key={m.path} src={m.url} alt={m.name} className="aspect-video w-full object-cover" />
            ) : (
              <video key={m.path} src={m.url} className="aspect-video w-full object-cover" muted playsInline />
            )
          )}
        </div>
      )}
    </div>
  );
}
