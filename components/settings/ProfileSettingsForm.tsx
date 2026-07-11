"use client";

import { useFormState } from "react-dom";
import { useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { updateProfileAction, type ProfileFormState } from "@/app/(app)/settings/actions";
import { Field, SubmitButton } from "@/components/ui/FormField";
import type { Profile } from "@/types/profile";

const selectClass =
  "w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors duration-200 focus:border-aurora-teal/50 focus:bg-white/[0.05]";

export default function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useFormState<ProfileFormState, FormData>(updateProfileAction, undefined);

  // The full canonical IANA list, not a hand-maintained one — every modern
  // browser and Node runtime supports Intl.supportedValuesOf.
  const timezones = useMemo(
    () => (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [profile.timezone]),
    [profile.timezone],
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <Field label="Display name" name="display_name" defaultValue={profile.display_name} placeholder="Aarav Sharma" />
      <Field label="Username" name="username" required={false} defaultValue={profile.username ?? ""} placeholder="aarav_creates" />
      <Field label="Avatar URL" name="avatar_url" required={false} defaultValue={profile.avatar_url ?? ""} placeholder="https://…" />

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
