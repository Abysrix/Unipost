"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared text input — the markup `AuthForm` and the password-reset forms each independently defined before this was extracted. */
export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  required = true,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/50">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors duration-200 focus:border-aurora-teal/50 focus:bg-white/[0.05]"
      />
    </label>
  );
}

/** Shared submit button — pending state via `useFormStatus`, so it must render inside the `<form>` it submits. */
export function SubmitButton({ label }: { label: string }) {
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
