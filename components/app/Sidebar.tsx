"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups } from "@/config/navigation";
import { hasRole } from "@/lib/auth/role";
import { useAppShell, type AppUser } from "./AppShell";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ user, collapsed }: { user: AppUser; collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center border-b border-white/[0.05]", collapsed ? "justify-center px-2" : "px-5")}>
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="UniPost dashboard">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            <span className="h-3 w-3 rounded-sm bg-black/80" />
          </span>
          {!collapsed && <span className="font-display text-base font-bold tracking-tight text-white">UniPost</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {navGroups.map((group) => {
          const items = group.items.filter((i) => hasRole(user.role, i.role));
          if (!items.length) return null;
          return (
            <div key={group.title} className="mb-5">
              {!collapsed && (
                <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">{group.title}</p>
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="group/item relative">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                          collapsed && "justify-center px-0",
                          active ? "bg-aurora-teal/10 text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
                        )}
                      >
                        {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-aurora-teal" />}
                        <Icon size={17} className={cn("shrink-0", active ? "text-aurora-teal" : "")} strokeWidth={1.75} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                      {/* Collapsed tooltip */}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-bg-elevated px-2 py-1 text-xs text-white/80 opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Upgrade card (free plan) */}
      {!collapsed && user.plan === "free" && (
        <div className="m-3 rounded-xl border border-aurora-teal/20 bg-aurora-teal/[0.06] p-4">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-white">
            <Sparkles size={14} className="text-aurora-teal" /> Go Pro
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-white/45">Unlock unlimited scheduling, the AI Growth Coach and advanced analytics.</p>
          <Link href="/billing" className="block rounded-full py-1.5 text-center text-xs font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ user }: { user: AppUser }) {
  const { collapsed, mobileOpen, setMobileOpen } = useAppShell();

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="hidden shrink-0 border-r border-white/[0.06] bg-bg-secondary transition-[width] duration-300 lg:block"
        style={{ width: collapsed ? 76 : 256 }}
      >
        <div className="sticky top-0 h-[100svh]">
          <SidebarContent user={user} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-[200] lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!mobileOpen}>
        <div
          className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        <div
          role="dialog"
          aria-label="Navigation"
          aria-modal={mobileOpen}
          className={cn(
            "absolute left-0 top-0 h-full w-[264px] border-r border-white/[0.06] bg-bg-secondary transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent user={user} collapsed={false} />
        </div>
      </div>
    </>
  );
}
