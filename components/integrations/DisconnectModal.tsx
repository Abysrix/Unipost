"use client";

import { useState } from "react";
import { Loader2, Unlink } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { ConnectedAccount } from "@/types/integrations";

export default function DisconnectModal({
  account,
  onClose,
  onConfirm,
}: {
  account: ConnectedAccount;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal open onClose={onClose} title="Disconnect account">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-white/60">
          UniPost will lose access to <span className="font-semibold text-white">{account.display_name}</span> and stop syncing it.
          Scheduled posts already queued for this account will fail until you reconnect. This won&apos;t delete any drafts.
        </p>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button onClick={onClose} disabled={busy} className="rounded-full border border-white/[0.12] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}
            disabled={busy}
            className="flex items-center gap-2 rounded-full bg-red-500/15 px-5 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />} Disconnect
          </button>
        </div>
      </div>
    </Modal>
  );
}
