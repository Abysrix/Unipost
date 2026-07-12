import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { getStoredHealth, listSystemEvents } from "@/lib/db/admin/health";
import { computeLiveHealthChecks } from "@/lib/admin/health-checks";
import SystemHealthPanel from "@/components/admin/SystemHealthPanel";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform Health · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  // Two sources composed at the page level, deliberately not merged inside
  // either function (Integration Sprint 6): getStoredHealth() is the
  // existing manual/opt-in config-presence snapshot (external API checks —
  // only refreshes when an admin clicks "Run health check"); liveChecks are
  // cheap local DB reads (queue depth, cron recency, webhook signatures)
  // safe to recompute on every page load, no quota concern either way.
  const [checks, events, liveChecks] = await Promise.all([getStoredHealth(), listSystemEvents(20), computeLiveHealthChecks()]);
  const lastCheckedAt = events.find((e) => e.event_type === "health_check_run")?.created_at ?? null;
  const allChecks = [...liveChecks, ...checks];

  return (
    <div>
      <PageHeader title="Platform Health" description="Live status of every service UniPost depends on." icon={HeartPulse} />
      <div className="mb-5">
        <SystemHealthPanel initialChecks={allChecks} lastCheckedAt={lastCheckedAt} />
      </div>

      <WidgetContainer title="System event log">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/35">No system events recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                <span className="text-[13px] text-white/70">{e.component} — {e.event_type.replace(/_/g, " ")}</span>
                <span className="font-mono text-[11px] text-white/30">{timeAgo(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </WidgetContainer>
    </div>
  );
}
