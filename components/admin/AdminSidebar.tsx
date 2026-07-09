"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Sparkles, HeartPulse, ShieldAlert, History, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Billing", href: "/admin/billing", icon: CreditCard },
  { label: "AI Usage", href: "/admin/ai", icon: Sparkles },
  { label: "Platform Health", href: "/admin/health", icon: HeartPulse },
  { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert },
  { label: "Audit Log", href: "/admin/audit", icon: History },
  { label: "Settings", href: "/admin/settings", icon: SlidersHorizontal },
];

/** Second-level navigation scoped to /admin/* — doesn't touch the main app sidebar. */
export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-1 lg:w-56 lg:flex-col lg:overflow-visible">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              active ? "bg-white/[0.08] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/85",
            )}
          >
            <item.icon size={15} className={active ? "text-aurora-teal" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
