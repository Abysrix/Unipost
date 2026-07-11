"use client";

import { useFormState } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { login, signup, type AuthState } from "@/app/(auth)/actions";
import { Field, SubmitButton } from "@/components/ui/FormField";

export default function AuthForm({
  mode,
  redirectTo = "/dashboard",
}: {
  mode: "login" | "signup";
  redirectTo?: string;
}) {
  const action = mode === "login" ? login : signup;
  const [state, formAction] = useFormState<AuthState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {mode === "signup" && (
        <Field label="Name" name="name" autoComplete="name" placeholder="Aarav Sharma" />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
      />
      <input type="hidden" name="redirect" value={redirectTo} />

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

      <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />
    </form>
  );
}
