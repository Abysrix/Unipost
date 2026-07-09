import type { Metadata } from "next";
import { requireUser, displayName } from "@/lib/auth/getUser";
import { getRole, getPlan } from "@/lib/auth/role";
import { isFlagEnabled } from "@/lib/db/admin/flags";
import AppShell, { type AppUser } from "@/components/app/AppShell";
import MaintenanceScreen from "@/components/admin/MaintenanceScreen";

// Every page under (app)/* is a signed-in user's private workspace — none of
// it should ever appear in search results. No child route overrides `robots`
// (checked: only `title` is set per-page), so this one export governs the
// whole authenticated surface, including /admin/*.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Protected application layout. Server-side session check (defense in depth
 * alongside middleware), then renders the authenticated shell every module
 * inherits. Resolves the view-model (name, role, plan) once, here.
 *
 * Maintenance mode is checked here (not in edge middleware) deliberately —
 * it's a DB read, and middleware runs on every request across the whole app
 * including the marketing site; scoping the check to the authenticated shell
 * avoids adding latency/failure risk to that hot path, and keeps the landing
 * + auth pages reachable during maintenance. Admins are always exempt, so
 * turning maintenance mode on can never lock out the admin who enabled it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const role = getRole(user);

  if (role !== "admin" && (await isFlagEnabled("maintenance_mode"))) {
    return <MaintenanceScreen />;
  }

  const appUser: AppUser = {
    name: displayName(user),
    email: user.email ?? "",
    avatarUrl: (user.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null,
    role,
    plan: getPlan(user),
  };

  return <AppShell user={appUser}>{children}</AppShell>;
}
