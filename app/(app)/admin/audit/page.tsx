import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { listAuditLogs, listUnifiedTimeline } from "@/lib/db/admin/audit";
import AuditTimeline from "@/components/admin/AuditTimeline";
import LogViewer from "@/components/admin/LogViewer";

export const metadata: Metadata = { title: "Audit Log · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const [logs, timeline] = await Promise.all([listAuditLogs(300), listUnifiedTimeline(30)]);

  return (
    <div>
      <PageHeader title="Audit Log" description="Every login, role change, admin action and platform event, in one place." icon={ScrollText} />

      <div className="mb-5">
        <WidgetContainer title="Recent activity">
          <AuditTimeline entries={timeline} />
        </WidgetContainer>
      </div>

      <WidgetContainer title="Full log">
        <LogViewer logs={logs} />
      </WidgetContainer>
    </div>
  );
}
