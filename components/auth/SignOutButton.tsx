"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";

const DEFAULT_CLASS =
  "flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/60 transition-colors duration-200 hover:border-white/25 hover:text-white disabled:opacity-70";

function Inner({ className, label }: { className?: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} data-cursor="pointer" className={className ?? DEFAULT_CLASS}>
      {pending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
      {label}
    </button>
  );
}

/** Sign-out form. Pass `className` to restyle (e.g., as a dropdown menu item). */
export default function SignOutButton({ className, label = "Sign out" }: { className?: string; label?: string }) {
  return (
    <form action={signOut}>
      <Inner className={className} label={label} />
    </form>
  );
}
