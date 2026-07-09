"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { platforms, FUTURE_PLATFORMS, type PlatformId } from "@/config/platforms";
import type { ConnectionWithPermissions, ConnectedAccount, SyncLog, IntegrationEvent } from "@/types/integrations";
import { syncNowAction, disconnectAction, getConnectionActivity } from "@/app/(app)/integrations/actions";
import Modal from "@/components/ui/Modal";
import PlatformCard from "./PlatformCard";
import ConnectionCard from "./ConnectionCard";
import DisconnectModal from "./DisconnectModal";
import AccountSelector from "./AccountSelector";

export default function IntegrationsHub({
  initialConnections,
  notice,
}: {
  initialConnections: ConnectionWithPermissions[];
  notice?: { kind: "connected"; platform: string } | { kind: "error"; message: string } | null;
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activity, setActivity] = useState<{ logs: SyncLog[]; events: IntegrationEvent[] } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<ConnectedAccount | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const byPlatform = useMemo(() => {
    const map = new Map<PlatformId, ConnectedAccount[]>();
    for (const c of connections) {
      if (c.status === "disconnected") continue;
      map.set(c.platform, [...(map.get(c.platform) ?? []), c]);
    }
    return map;
  }, [connections]);

  const detail = detailId ? connections.find((c) => c.id === detailId) ?? null : null;
  const siblingAccounts = detail ? byPlatform.get(detail.platform) ?? [] : [];

  async function openDetail(account: ConnectedAccount) {
    setDetailId(account.id);
    setActivity(null);
    const data = await getConnectionActivity(account.id);
    setActivity(data);
  }

  async function sync(account: ConnectedAccount) {
    setSyncingId(account.id);
    const res = await syncNowAction(account.id);
    setSyncingId(null);
    setConnections((prev) =>
      prev.map((c) => (c.id === account.id ? { ...c, status: res.ok ? "connected" : c.status, last_sync_at: res.ok ? new Date().toISOString() : c.last_sync_at, last_error: res.ok ? null : ("message" in res ? res.message : null) } : c)),
    );
    if (detailId === account.id) {
      const data = await getConnectionActivity(account.id);
      setActivity(data);
    }
  }

  async function confirmDisconnect() {
    if (!disconnectTarget) return;
    await disconnectAction(disconnectTarget.id);
    setConnections((prev) => prev.map((c) => (c.id === disconnectTarget.id ? { ...c, status: "disconnected" } : c)));
    setDisconnectTarget(null);
    setDetailId(null);
  }

  return (
    <div>
      {notice && !dismissed && (
        <div className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${notice.kind === "connected" ? "border-aurora-green/20 bg-aurora-green/[0.06] text-aurora-green" : "border-red-500/20 bg-red-500/[0.06] text-red-400"}`}>
          {notice.kind === "connected" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          <span className="flex-1">
            {notice.kind === "connected" ? `Connected ${notice.platform} successfully.` : `Couldn't connect: ${notice.message.replace(/_/g, " ")}`}
          </span>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-current opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <PlatformCard key={p.id} platform={p} accounts={byPlatform.get(p.id) ?? []} onManage={openDetail} onSync={sync} syncingId={syncingId} />
        ))}
        {FUTURE_PLATFORMS.map((p) => (
          <PlatformCard key={p.id} platform={p} comingSoon />
        ))}
      </div>

      <Modal open={!!detail} onClose={() => setDetailId(null)} title="Connection details">
        {detail && (
          <div className="space-y-4">
            {siblingAccounts.length > 1 && (
              <AccountSelector accounts={siblingAccounts} value={detail.id} onChange={(id) => { const acc = siblingAccounts.find((a) => a.id === id); if (acc) void openDetail(acc); }} />
            )}
            {activity ? (
              <ConnectionCard connection={detail} logs={activity.logs} events={activity.events} onSync={() => sync(detail)} onDisconnect={() => setDisconnectTarget(detail)} syncing={syncingId === detail.id} />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-white/30">Loading…</div>
            )}
          </div>
        )}
      </Modal>

      {disconnectTarget && <DisconnectModal account={disconnectTarget} onClose={() => setDisconnectTarget(null)} onConfirm={confirmDisconnect} />}
    </div>
  );
}
