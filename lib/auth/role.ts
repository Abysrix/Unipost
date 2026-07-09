import type { User } from "@supabase/supabase-js";

export type Role = "creator" | "admin";
export type Plan = "free" | "pro" | "agency";

/**
 * Resolve a user's role. Source of truth (until the `profiles` table lands in a
 * later sprint) is Supabase `app_metadata.role`, with an env allow-list fallback
 * for bootstrapping admins. Server-only (reads process.env).
 */
export function getRole(user: User): Role {
  const metaRole = (user.app_metadata as { role?: string } | undefined)?.role;
  if (metaRole === "admin") return "admin";

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && allowlist.includes(user.email.toLowerCase())) return "admin";

  return "creator";
}

export function isAdmin(user: User): boolean {
  return getRole(user) === "admin";
}

/** Resolve a user's subscription plan (placeholder until billing/DB exists). */
export function getPlan(user: User): Plan {
  const metaPlan = (user.app_metadata as { plan?: string } | undefined)?.plan;
  if (metaPlan === "pro" || metaPlan === "agency") return metaPlan;
  return "free";
}

/** True if `role` satisfies the `required` role (admin ⊇ creator). */
export function hasRole(role: Role, required?: Role): boolean {
  if (!required) return true;
  if (required === "creator") return true;
  return role === "admin";
}
