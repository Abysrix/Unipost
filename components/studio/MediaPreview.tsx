/* eslint-disable @next/next/no-img-element */
import { X, Play } from "lucide-react";
import type { PostMedia } from "@/types/post";

/** Grid of attached media with remove buttons. (User-uploaded dynamic URLs → <img>.) */
export default function MediaPreview({ media, onRemove }: { media: PostMedia[]; onRemove: (path: string) => void }) {
  if (!media.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {media.map((m) => (
        <div key={m.path} className="group relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-black/40">
          {m.type === "image" ? (
            <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
          ) : (
            <>
              <video src={m.url} className="h-full w-full object-cover" muted playsInline />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60"><Play size={14} className="ml-0.5 text-white/80" /></span>
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => onRemove(m.path)}
            aria-label={`Remove ${m.name}`}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/80 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
