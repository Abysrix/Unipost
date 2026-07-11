"use client";

import { useFormState } from "react-dom";
import { AlertCircle } from "lucide-react";
import { updatePassword, requestPasswordReset, type AuthState } from "@/app/(auth)/actions";
import { Field, SubmitButton } from "@/components/ui/FormField";

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
