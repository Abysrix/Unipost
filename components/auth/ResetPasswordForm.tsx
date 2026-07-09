"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { updatePassword, requestPasswordReset, type AuthState } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

function Field({ label, name, type = "text", autoComplete, placeholder }: { label: string; name: string; type?: string; autoComplete?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/50">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors duration-200 focus:border-aurora-teal/50 focus:bg-white/[0.05]"
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-black transition-all duration-300",
        "[background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] hover:shadow-[0_0_40px_rgba(45,212,191,0.35)]",
        pending && "cursor-wait opacity-70",
      )}
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Please wait…" : label}
    </button>
  );
}

/** The "send me a reset link" form — /forgot-password. */
export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(requestPasswordReset, undefined);
  if (state?.message) {
    return <p className="rounded-lg border border-aurora-green/20 bg-aurora-green/[0.08] px-3 py-2.5 text-sm text-aurora-green">{state.message}</p>;
  }
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
      {state?.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {state.error}
        </p>
      )}
      <SubmitButton label="Send reset link" />
    </form>
  );
}

/** The "set a new password" form — /reset-password (landed on after clicking the emailed link). */
export function ResetPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(updatePassword, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label="New password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" />
      {state?.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {state.error}
        </p>
      )}
      <SubmitButton label="Update password" />
    </form>
  );
}
