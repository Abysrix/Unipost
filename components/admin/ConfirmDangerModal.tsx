"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

/**
 * Reusable destructive-action confirmation — requires typing an exact phrase
 * (e.g. the target's email) before the danger button enables. Used for every
 * irreversible admin action (delete user, bulk-delete content).
 */
export default function ConfirmDangerModal({
  title,
  description,
  confirmPhrase,
  confirmLabel = "Confirm",
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  /** The exact text the admin must type to enable the confirm button. */
  confirmPhrase: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed === confirmPhrase;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[13px] leading-relaxed text-white/70">{description}</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">
            Type <span className="font-mono text-white/80">{confirmPhrase}</span> to confirm
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-red-400/50"
            autoComplete="off"
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button onClick={onClose} disabled={busy} className="rounded-full border border-white/[0.12] px-5 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!matches || busy}
            className="flex items-center gap-2 rounded-full bg-red-500/15 px-5 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-40"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
