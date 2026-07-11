"use client";

import { useState } from "react";
import { RefreshCw, Unlink, ShieldCheck, History, Loader2, Star, Check } from "lucide-react";
import { getPlatform } from "@/config/platforms";
import { formatDateTime } from "@/lib/schedule/timezone";
import type { ConnectionWithPermissions, SyncLog, IntegrationEvent } from "@/types/integrations";
import ConnectionStatus from "./ConnectionStatus";
import SyncBadge from "./SyncBadge";
import PermissionCard from "./PermissionCard";
import CapabilityList from "./CapabilityList";
import SyncHistory from "./SyncHistory";
import ReconnectModal from "./ReconnectModal";

export default function ConnectionCard({
  connection,
  logs,
  events,
  onSync,
  onDisconnect,
  onSetDefault,
  onRename,
  syncing = false,
}: {
  connection: ConnectionWithPermissions;
  logs: SyncLog[];
  events: IntegrationEvent[];
  onSync: () => void;
  onDisconnect: () => void;
  onSetDefault?: () => void;
  onRename?: (nickname: string) => void;
  syncing?: boolean;
}) {
  const [showReconnect, setShowReconnect] = useState(false);
  const [nickname, setNickname] = useState(connection.nickname ?? "");
  const [editingNickname, setEditingNickname] = useState(false);
  const platform = getPlatform(connection.platform);
  const needsReconnect = connection.status === "expired" || connection.status === "revoked" || connection.status === "error";

  function saveNickname() {
    onRename?.(nickname);
    setEditingNickname(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {connection.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element -- external/provider-supplied avatar URL, not a local asset next/image can optimize
            <img src={connection.profile_image} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold" style={{ background: `${platform?.color}22`, color: platform?.color }}>
              {platform?.glyph}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-base font-bold text-white">{connection.nickname || connection.display_name}</h3>
              {connection.is_default && <Star size={12} className="shrink-0 fill-aurora-yellow text-aurora-yellow" aria-label="Default account" />}
            </div>
            {connection.username && <p className="truncate text-[12px] text-white/40">@{connection.username}</p>}
          </div>
        </div>
        <ConnectionStatus status={connection.status} />
      </div>

      {onRename && (
        editingNickname ? (
          <div className="flex items-center gap-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={connection.display_name}
              maxLength={60}
              autoFocus
              className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[13px] text-white outline-none focus:border-aurora-teal/50"
            />
            <button onClick={saveNickname} aria-label="Save nickname" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] text-white/60 transition-colors hover:border-aurora-teal/50 hover:text-aurora-teal">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingNickname(true)} className="text-left text-[12px] text-white/40 transition-colors hover:text-white/70">
            {connection.nickname ? "Edit nickname" : "Add a nickname"}
          </button>
        )
      )}

      {connection.last_error && (
        <p className="rounded-lg bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-400">{connection.last_error}</p>
      )}

      <div className="flex items-center justify-between text-[12px]">
        <SyncBadge lastSyncAt={connection.last_sync_at} syncing={syncing} />
        <span className="text-white/30">Connected {formatDateTime(connection.created_at)}</span>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <ShieldCheck size={12} /> Permissions
        </p>
        <div className="space-y-1.5">
          {connection.permissions.map((p) => (
            <PermissionCard key={p.id} permission={p} />
          ))}
        </div>
      </div>

      {platform && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Capabilities</p>
          <CapabilityList capabilities={platform.capabilities} />
        </div>
      )}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <History size={12} /> Activity
        </p>
        <SyncHistory logs={logs} events={events} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
        <button onClick={onSync} disabled={syncing} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50">
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync now
        </button>
        {needsReconnect && (
          <button onClick={() => setShowReconnect(true)} className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            Reconnect
          </button>
        )}
        {onSetDefault && !connection.is_default && (
          <button onClick={onSetDefault} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white">
            <Star size={14} /> Set as default
          </button>
        )}
        <button onClick={onDisconnect} className="ml-auto flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-300">
          <Unlink size={14} /> Disconnect
        </button>
      </div>

      {showReconnect && <ReconnectModal account={connection} onClose={() => setShowReconnect(false)} />}
    </div>
  );
}
