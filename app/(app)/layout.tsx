import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/getUser";
import { getOwnProfile } from "@/lib/db/profiles";
import { isFlagEnabled } from "@/lib/db/admin/flags";
import { listNotifications } from "@/lib/notifications/service";
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
  try {
    const [user, profile, isMaintenance, notifications] = await Promise.all([
      requireUser(),
      getOwnProfile(),
      isFlagEnabled("maintenance_mode"),
      listNotifications().catch(() => []),
    ]);

    if (profile.role !== "admin" && isMaintenance) {
      return <MaintenanceScreen />;
    }

    const appUser: AppUser = {
      name: profile.display_name || user.email?.split("@")[0] || "Creator",
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      plan: profile.plan,
      creatorScore: profile.creator_score,
      xp: profile.xp,
    };

    return <AppShell user={appUser} notifications={notifications}>{children}</AppShell>;
  } catch (err: any) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6 font-mono text-xs">
          <h2 className="mb-4 text-sm font-bold text-red-500">Database Permission Error (42501)</h2>
          <div className="space-y-2 text-red-400">
            <p><strong>Code:</strong> {err?.code || "Unknown"}</p>
            <p><strong>Message:</strong> {err?.message || JSON.stringify(err)}</p>
            <p><strong>Details:</strong> {err?.details || "None"}</p>
            <p><strong>Hint:</strong> {err?.hint || "None"}</p>
          </div>
          <p className="mt-4 text-white/40">This usually means a table, function, or schema is missing the correct SELECT or EXECUTE grants for the signed-in user.</p>
        </div>
      </div>
    );
  }
}
