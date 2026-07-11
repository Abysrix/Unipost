import type { Role, Plan } from "@/types/profile";

export type { Role, Plan };

/**
 * Pure role predicates over an already-resolved `Role` (from
 * `getOwnProfile()`, Integration Sprint 1) — no DB or JWT read here anymore.
 * Role/plan used to be resolved synchronously from `app_metadata` per call;
 * now there's exactly one async read per request (`getOwnProfile()`, React
 * `cache()`-wrapped), and everything downstream is a cheap sync check.
 */
export function isAdmin(role: Role): boolean {
  return role === "admin";
}

/** True if `role` satisfies `required` (admin ⊇ everything else). */
export function hasRole(role: Role, required?: Role): boolean {
  if (!required) return true;
  if (required === "creator") return true;
  return role === "admin";
}
