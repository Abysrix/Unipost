import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  FileText,
  BarChart3,
  Trophy,
  Sparkles,
  Bot,
  Link2,
  CreditCard,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/role";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Minimum role required to see this item. Omit = everyone. */
  role?: Role;
  badge?: string;
};

export type NavGroup = { title: string; items: NavItem[] };

/**
 * Dashboard navigation — the single source of truth for the sidebar.
 * Role-aware: items with `role: "admin"` only render for admins.
 * Every href must live under the `(app)` route group (Sprint-1 protection invariant).
 */
export const navGroups: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Create Post", href: "/create", icon: PenSquare },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Posts", href: "/posts", icon: FileText },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Creator Score", href: "/score", icon: Trophy },
    ],
  },
  {
    title: "AI",
    items: [
      { label: "AI Studio", href: "/ai", icon: Sparkles },
      { label: "Growth Coach", href: "/coach", icon: Bot },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Integrations", href: "/integrations", icon: Link2 },
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Admin", href: "/admin", icon: Shield, role: "admin" },
    ],
  },
];

/** Flat list of all nav items (for breadcrumbs / active matching). */
export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);
