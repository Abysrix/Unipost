"use client";

import { Loader2, RefreshCw, Settings2, Clock } from "lucide-react";
import type { Platform, FuturePlatform } from "@/config/platforms";
import type { ConnectedAccount } from "@/types/integrations";
import ConnectionStatus from "./ConnectionStatus";
import SyncBadge from "./SyncBadge";
import OAuthButton from "./OAuthButton";

type Props =
  | {
      comingSoon?: false;
      platform: Platform;
      accounts: ConnectedAccount[];
      onManage: (account: ConnectedAccount) => void;
      onSync: (account: ConnectedAccount) => void;
      syncingId?: string | null;
    }
  | { comingSoon: true; platform: FuturePlatform };

/** One platform tile in the integrations hub — connect, connected, or coming-soon. */
export default function PlatformCard(props: Props) {
  const { platform } = props;
  // The default account represents this platform's tile when there's more
  // than one — falls back to whichever was returned first (e.g. mid-migration
  // before any account has been explicitly marked default).
  const primary = props.comingSoon ? undefined : props.accounts.find((a) => a.is_default) ?? props.accounts[0];
  const accountCount = props.comingSoon ? 0 : props.accounts.length;

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.14]">
      <div className="mb-4 flex items-center justify-between">
        {primary?.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external/provider-supplied avatar URL, not a local asset next/image can optimize
          <img src={primary.profile_image} alt="" className="h-11 w-11 rounded-xl object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold" style={{ background: `${platform.color}22`, color: platform.color }}>
            {platform.glyph}
          </span>
        )}
        {primary && <ConnectionStatus status={primary.status} />}
        {props.comingSoon && (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
            <Clock size={10} /> Soon
          </span>
        )}
      </div>

      <h3 className="font-display text-base font-bold text-white">{platform.name}</h3>

      {props.comingSoon ? (
        <p className="mt-1 text-[13px] text-white/35">Coming in a future update.</p>
      ) : primary ? (
        <>
          <p className="mt-1 truncate text-[13px] text-white/60">{primary.display_name}</p>
          <div className="mt-2">
            <SyncBadge lastSyncAt={primary.last_sync_at} syncing={props.syncingId === primary.id} />
          </div>
          {accountCount > 1 && <p className="mt-1 text-[11px] text-aurora-teal">+{accountCount - 1} more account{accountCount > 2 ? "s" : ""}</p>}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => props.onManage(primary)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] py-2 text-[12px] font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white">
              <Settings2 size={13} /> Manage
            </button>
            <button onClick={() => props.onSync(primary)} disabled={props.syncingId === primary.id} aria-label="Sync now" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50">
              {props.syncingId === primary.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-white/35">Not connected</p>
          <div className="mt-4">
            {!props.comingSoon && <OAuthButton platform={props.platform.id} className="w-full" />}
          </div>
        </>
      )}
    </div>
  );
}
