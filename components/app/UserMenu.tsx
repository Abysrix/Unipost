"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, CreditCard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SignOutButton from "@/components/auth/SignOutButton";
import type { AppUser } from "./AppShell";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";
}

/** Avatar + dropdown (profile summary, account links, sign out). */
export default function UserMenu({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-cursor="pointer"
        className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-2 transition-colors hover:border-white/20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-aurora-cyan/40 to-aurora-green/40 text-[11px] font-bold text-white">
          {initials(user.name)}
        </span>
        <ChevronDown size={13} className={cn("text-white/40 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.1] bg-bg-secondary shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="truncate text-sm font-semibold text-white">{user.name}</div>
            <div className="truncate text-xs text-white/40">{user.email}</div>
          </div>
          <div className="p-1.5">
            <Link href="/settings" role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
              <Settings size={15} /> Settings
            </Link>
            <Link href="/billing" role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
              <CreditCard size={15} /> Billing
            </Link>
          </div>
          <div className="border-t border-white/[0.06] p-1.5">
            <SignOutButton className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-300/90 transition-colors hover:bg-red-500/10" />
          </div>
        </div>
      )}
    </div>
  );
}
