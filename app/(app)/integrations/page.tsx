import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { listConnections } from "@/lib/db/integrations";
import PageHeader from "@/components/dashboard/PageHeader";
import IntegrationsHub from "@/components/integrations/IntegrationsHub";
import type { ConnectionWithPermissions } from "@/types/integrations";

export const metadata: Metadata = { title: "Integrations · UniPost" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  await requireUser();

  let connections: ConnectionWithPermissions[] = [];
  try {
    connections = await listConnections();
  } catch {
    /* tables not migrated yet — render an empty hub */
  }

  const connected = typeof searchParams.connected === "string" ? searchParams.connected : null;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const notice = connected ? ({ kind: "connected", platform: connected } as const) : error ? ({ kind: "error", message: error } as const) : null;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Integrations" description="Connect your platforms so UniPost can publish, sync and analyze on your behalf." icon={Link2} />
      <IntegrationsHub initialConnections={connections} notice={notice} />
    </div>
  );
}
