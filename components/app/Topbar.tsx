"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, PanelLeft, Search, Bell, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppShell, type AppUser } from "./AppShell";
import Breadcrumbs from "./Breadcrumbs";
import UserMenu from "./UserMenu";

const planStyle: Record<AppUser["plan"], string> = {
  free: "border-white/[0.1] bg-white/[0.03] text-white/50",
  pro: "border-aurora-teal/30 bg-aurora-teal/10 text-aurora-teal",
  agency: "border-aurora-yellow/30 bg-aurora-yellow/10 text-aurora-yellow",
};

function PlanBadge({ plan }: { plan: AppUser["plan"] }) {
  return (
    <span className={cn("hidden rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider sm:inline-flex", planStyle[plan])}>
      {plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Agency"}
    </span>
  );
}

function WorkspaceSwitcher() {
  return (
    <button
      type="button"
      data-cursor="pointer"
      className="hidden items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-sm text-white/70 transition-colors hover:border-white/15 md:flex"
      title="Workspace (more coming soon)"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-aurora-cyan/50 to-aurora-green/50 text-[9px] font-bold text-black">P</span>
      <span className="max-w-[110px] truncate">Personal</span>
      <ChevronDown size={13} className="text-white/30" />
    </button>
  );
}

function SearchButton() {
  return (
    <button
      type="button"
      data-cursor="pointer"
      className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-sm text-white/40 transition-colors hover:border-white/15 hover:text-white/70"
      aria-label="Search"
    >
      <Search size={15} />
      <span className="hidden lg:inline">Search…</span>
      <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/40 lg:inline">⌘K</kbd>
    </button>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        data-cursor="pointer"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-white/60 transition-colors hover:border-white/15 hover:text-white"
      >
        <Bell size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/[0.1] bg-bg-secondary shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/[0.06] px-4 py-3 text-sm font-semibold text-white">Notifications</div>
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]"><Check size={16} className="text-aurora-green" /></span>
            <p className="text-sm text-white/50">You&apos;re all caught up</p>
            <p className="text-xs text-white/30">New activity will show up here.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Sticky glass top navigation bar. */
export default function Topbar({ user }: { user: AppUser }) {
  const { toggleCollapsed, setMobileOpen } = useAppShell();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-bg-primary/70 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)} aria-label="Open menu" data-cursor="pointer" className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.05] lg:hidden">
        <Menu size={18} />
      </button>
      {/* Desktop collapse toggle */}
      <button onClick={toggleCollapsed} aria-label="Toggle sidebar" data-cursor="pointer" className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white lg:flex">
        <PanelLeft size={17} />
      </button>

      <WorkspaceSwitcher />
      <div className="mx-1 hidden h-5 w-px bg-white/10 md:block" />
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <SearchButton />
        <NotificationBell />
        <PlanBadge plan={user.plan} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
