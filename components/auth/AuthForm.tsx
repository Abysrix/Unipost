"use client";

import { useFormState } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { login, signup, type AuthState } from "@/app/(auth)/actions";
import { Field, SubmitButton } from "@/components/ui/FormField";

/** Maps raw Supabase/server error strings to user-friendly messages. */
function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("email not confirmed"))
    return "This email is already registered but not confirmed yet. Check your inbox for a confirmation link, or contact support.";
  if (s.includes("user already registered") || s.includes("already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (s.includes("email signups are disabled") || s.includes("email provider is disabled"))
    return "Email sign-up is currently disabled. Please use 'Continue with Google' to create your account.";
  if (s.includes("over_email_send_rate_limit") || s.includes("email rate limit"))
    return "Too many emails sent to this address recently. Please wait a few minutes and try again.";
  if (s.includes("password should be at least"))
    return "Your password must be at least 8 characters long.";
  if (s.includes("invalid email"))
    return "Please enter a valid email address.";
  if (s.includes("signup is disabled") || s.includes("signups not allowed"))
    return "New sign-ups are temporarily paused. Please try again later or contact support.";
  if (s.includes("invalid login credentials") || s.includes("invalid credentials"))
    return "Incorrect email or password. Please try again.";
  if (s.includes("email link is invalid") || s.includes("token has expired"))
    return "This link has expired or already been used. Please request a new one.";
  if (s.includes("network") || s.includes("fetch"))
    return "A network error occurred. Please check your connection and try again.";
  // Fall back to the original message, but capitalise it nicely
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-3 text-xs text-red-300"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{friendlyError(state.error)}</span>
        </div>
      )}
      {state?.message && (
        <div className="flex items-start gap-2.5 rounded-lg border border-aurora-green/20 bg-aurora-green/[0.08] px-3 py-3 text-xs text-aurora-green">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{state.message}</span>
        </div>
      )}

      <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />
    </form>
  );
}
