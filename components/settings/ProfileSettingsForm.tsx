"use client";

import { useFormState } from "react-dom";
import { useMemo, useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Camera, Loader2, Trash2 } from "lucide-react";
import { updateProfileAction, type ProfileFormState } from "@/app/(app)/settings/actions";
import { Field, SubmitButton } from "@/components/ui/FormField";
import type { Profile } from "@/types/profile";
import { createClient } from "@/lib/supabase/client";

const selectClass =
  "w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors duration-200 focus:border-aurora-teal/50 focus:bg-white/[0.05]";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";
}

export default function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState<ProfileFormState, FormData>(updateProfileAction, undefined);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The full canonical IANA list, not a hand-maintained one — every modern
  // browser and Node runtime supports Intl.supportedValuesOf.
  const timezones = useMemo(
    () => (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [profile.timezone]),
    [profile.timezone],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      return;
    }
    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const supabase = createClient();
    const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${profile.id}/avatar-${crypto.randomUUID()}-${sanitize(file.name)}`;

    try {
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <Field label="Display name" name="display_name" defaultValue={profile.display_name} placeholder="Aarav Sharma" />
      <Field label="Username" name="username" required={false} defaultValue={profile.username ?? ""} placeholder="aarav_creates" />

      {/* Avatar Uploader */}
      <div className="flex flex-col gap-2 mb-2">
        <span className="text-xs font-medium text-white/50">Profile Picture</span>
        <div className="flex items-center gap-5">
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full border border-white/[0.08] relative overflow-hidden group flex items-center justify-center bg-white/[0.03] transition-all hover:border-aurora-teal/50 cursor-pointer"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white bg-gradient-to-br from-aurora-cyan/40 to-aurora-green/40 w-full h-full flex items-center justify-center">
                {initials(profile.display_name || "Creator")}
              </span>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white/90 gap-1 font-medium">
              <Camera size={16} />
              <span>Change</span>
            </div>

            {/* Uploading loading spinner */}
            {uploading && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-aurora-teal" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                Upload Photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.02] px-3 py-1.5 text-xs font-semibold text-red-300/80 transition-colors hover:bg-red-500/[0.06] hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <span className="text-[11px] text-white/30">JPG, PNG or WEBP up to 5MB.</span>
          </div>
        </div>

        {/* Hidden input to pass the avatar URL to the form action */}
        <input type="hidden" name="avatar_url" value={avatarUrl || ""} />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300 mt-1">
            <AlertCircle size={13} className="shrink-0" /> {uploadError}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-white/50">Bio</span>
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          maxLength={280}
          rows={3}
          placeholder="Tell your audience what you create…"
          className="w-full resize-none rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors duration-200 focus:border-aurora-teal/50 focus:bg-white/[0.05]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-white/50">Timezone</span>
        <select name="timezone" defaultValue={profile.timezone} className={selectClass}>
          {timezones.map((tz) => (
            <option key={tz} value={tz} className="bg-bg-secondary">
              {tz}
            </option>
          ))}
        </select>
      </label>

      {state?.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {state.error}
        </p>
      )}
      {state?.message && (
        <p className="flex items-center gap-2 rounded-lg border border-aurora-green/20 bg-aurora-green/[0.08] px-3 py-2 text-xs text-aurora-green">
          <CheckCircle2 size={14} className="shrink-0" /> {state.message}
        </p>
      )}

      <SubmitButton label="Save changes" />
    </form>
  );
}
