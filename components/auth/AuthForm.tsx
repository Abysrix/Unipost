"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { login, signup, type AuthState } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
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
      data-cursor="pointer"
      className={cn(
        "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-black transition-all duration-300",
        "[background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] hover:shadow-[0_0_40px_rgba(45,212,191,0.35)]",
        pending && "cursor-wait opacity-70"
      )}
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Please wait…" : label}
    </button>
  );
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
