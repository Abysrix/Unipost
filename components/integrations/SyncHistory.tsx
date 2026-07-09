import { CheckCircle2, XCircle, Link2, Unlink, RotateCw, KeyRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { SyncLog, IntegrationEvent } from "@/types/integrations";

type Row = { id: string; at: string; label: string; ok: boolean; icon: LucideIcon };

const EVENT_META: Record<IntegrationEvent["event_type"], { label: string; icon: LucideIcon; ok: boolean }> = {
  connected: { label: "Connected", icon: Link2, ok: true },
  reconnected: { label: "Reconnected", icon: RotateCw, ok: true },
  disconnected: { label: "Disconnected", icon: Unlink, ok: true },
  revoked: { label: "Access revoked", icon: Unlink, ok: false },
  token_refreshed: { label: "Token refreshed", icon: KeyRound, ok: true },
  sync_completed: { label: "Sync completed", icon: CheckCircle2, ok: true },
  sync_failed: { label: "Sync failed", icon: XCircle, ok: false },
  permission_changed: { label: "Permissions changed", icon: KeyRound, ok: true },
};

/** Merged timeline of sync operations + lifecycle events for one connection. */
export default function SyncHistory({ logs, events }: { logs: SyncLog[]; events: IntegrationEvent[] }) {
  const rows: Row[] = [
    ...logs.map((l) => ({ id: `log-${l.id}`, at: l.created_at, label: `${l.sync_type.replace("_", " ")} sync — ${l.message ?? (l.status === "success" ? "ok" : "failed")}`, ok: l.status === "success", icon: l.status === "success" ? CheckCircle2 : XCircle })),
    ...events.map((e) => ({ id: `evt-${e.id}`, at: e.created_at, label: e.message ?? EVENT_META[e.event_type].label, ok: EVENT_META[e.event_type].ok, icon: EVENT_META[e.event_type].icon })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (rows.length === 0) return <p className="py-4 text-center text-xs text-white/30">No activity yet.</p>;

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.slice(0, 12).map((r) => {
        const Icon = r.icon;
        return (
          <li key={r.id} className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
            <Icon size={13} className={r.ok ? "text-aurora-green" : "text-red-400"} />
            <span className="min-w-0 flex-1 truncate text-[12px] capitalize text-white/65">{r.label}</span>
            <span className="shrink-0 font-mono text-[10px] text-white/30">{timeAgo(r.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
