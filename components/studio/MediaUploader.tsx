"use client";

import { useRef, useState, useImperativeHandle, forwardRef } from "react";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA, validateFile } from "@/lib/validations/post";
import type { PostMedia, MediaType } from "@/types/post";
import MediaPreview from "./MediaPreview";

const BUCKET = "post-media";
const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

export type MediaUploaderHandle = { open: () => void };

/**
 * Media manager — validates, uploads to Supabase Storage under
 * `{userId}/{uuid}-{name}`, previews, and removes. Public bucket → public URLs.
 * Owner-only writes enforced by storage RLS. Exposes `open()` for the toolbar.
 */
const MediaUploader = forwardRef<MediaUploaderHandle, {
  userId: string;
  media: PostMedia[];
  onChange: (media: PostMedia[]) => void;
  disabled?: boolean;
}>(function MediaUploader({ userId, media, onChange, disabled }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }));

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const supabase = createClient();
    let current = media;

    for (const file of Array.from(files)) {
      if (current.length >= MEDIA.maxPerPost) {
        setError(`You can attach up to ${MEDIA.maxPerPost} items.`);
        break;
      }
      const invalid = validateFile(file);
      if (invalid) {
        setError(invalid);
        continue;
      }

      const tempId = `${file.name}-${Date.now()}`;
      setUploading((u) => [...u, tempId]);
      const path = `${userId}/${crypto.randomUUID()}-${sanitize(file.name)}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      setUploading((u) => u.filter((id) => id !== tempId));

      if (upErr) {
        setError(upErr.message || "Upload failed. Please try again.");
        continue;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const type: MediaType = file.type.startsWith("video") ? "video" : "image";
      current = [...current, { path, url: data.publicUrl, type, name: file.name, size: file.size }];
      onChange(current);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(path: string) {
    onChange(media.filter((m) => m.path !== path));
    try {
      await createClient().storage.from(BUCKET).remove([path]);
    } catch {
      /* file already gone / offline — the array is the source of truth */
    }
  }

  const full = media.length >= MEDIA.maxPerPost;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={[...MEDIA.imageTypes, ...MEDIA.videoTypes].join(",")}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <MediaPreview media={media} onRemove={remove} />

      {uploading.map((id) => (
        <div key={id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/50">
          <Loader2 size={13} className="animate-spin text-aurora-teal" />
          <span className="flex-1 truncate">Uploading…</span>
          <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full w-1/2 animate-pulse rounded-full bg-aurora-teal" />
          </span>
        </div>
      ))}

      {!full && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          data-cursor="pointer"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.14] bg-white/[0.01] px-4 py-6 text-center transition-colors hover:border-aurora-teal/40 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadCloud size={20} className="text-white/40" />
          <span className="text-[13px] font-medium text-white/60">Add photos or video</span>
          <span className="text-[11px] text-white/30">JPG, PNG, WEBP, GIF, MP4 · up to {media.length}/{MEDIA.maxPerPost}</span>
        </button>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-[11px] text-red-300">
          <AlertCircle size={13} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
});

export default MediaUploader;
