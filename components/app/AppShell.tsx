"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { Role, Plan } from "@/lib/auth/role";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export type AppUser = {
  name: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
  role: Role;
  plan: Plan;
  creatorScore?: number;
  xp?: number;
};

type ShellCtx = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

const Ctx = createContext<ShellCtx | null>(null);
export function useAppShell(): ShellCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppShell must be used within <AppShell>");
  return ctx;
}

/**
 * AppShell — the authenticated frame every module inherits: a persistent
 * sidebar (collapsible on desktop, a drawer on mobile) and a sticky topbar.
 * Server layout passes the resolved `user`; interactivity lives here.
 */
export default function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Restore/persist desktop collapse preference.
  useEffect(() => {
    setCollapsed(localStorage.getItem("unipost:sidebar-collapsed") === "1");
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("unipost:sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  // Close the mobile drawer on navigation + on Escape.
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }}>
      <div className="flex min-h-[100svh] bg-bg-primary">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} />
          <main id="main" className="flex-1 px-5 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
