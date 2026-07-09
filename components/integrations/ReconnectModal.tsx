"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import OAuthButton from "./OAuthButton";
import type { ConnectedAccount } from "@/types/integrations";

export default function ReconnectModal({ account, onClose }: { account: ConnectedAccount; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Reconnect account">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-[13px] leading-relaxed text-white/70">
            <span className="font-semibold text-white">{account.display_name}</span>
            {account.status === "expired" ? "'s access has expired." : account.status === "revoked" ? "'s access was revoked." : " ran into a sync error."} Reconnecting
            will refresh permissions and resume syncing — no content is lost.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button onClick={onClose} className="rounded-full border border-white/[0.12] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
            Cancel
          </button>
          <OAuthButton platform={account.platform} mode="reconnect" className="!rounded-full !px-5 !py-2" />
        </div>
      </div>
    </Modal>
  );
}
