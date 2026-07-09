import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { getStoredHealth, listSystemEvents } from "@/lib/db/admin/health";
import SystemHealthPanel from "@/components/admin/SystemHealthPanel";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform Health · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  const [checks, events] = await Promise.all([getStoredHealth(), listSystemEvents(20)]);
  const lastCheckedAt = events.find((e) => e.event_type === "health_check_run")?.created_at ?? null;

  return (
    <div>
      <PageHeader title="Platform Health" description="Live status of every service UniPost depends on." icon={HeartPulse} />
      <div className="mb-5">
        <SystemHealthPanel initialChecks={checks} lastCheckedAt={lastCheckedAt} />
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
