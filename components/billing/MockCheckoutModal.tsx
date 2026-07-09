"use client";

import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatINR } from "@/lib/billing/plans";
import { mockPay } from "@/app/(app)/billing/actions";

/**
 * Stands in for Razorpay's real Checkout.js popup when no `RAZORPAY_KEY_ID` is
 * configured — loading the real widget with an empty key would just fail.
 * Visually distinct on purpose (reads as "a payment processor," not UniPost's
 * own UI), same idea as Sprint 7's mock OAuth consent screen. "Pay" flows
 * through the exact same server-side verify → activate path a real payment
 * success handler would use.
 */
export default function MockCheckoutModal({
  orderId,
  planName,
  amount,
  onClose,
  onSuccess,
}: {
  orderId: string;
  planName: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await mockPay(orderId);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Payment failed.");
    onSuccess();
  }

  return (
    <Modal open onClose={onClose} title="Razorpay Checkout" className="max-w-sm !bg-[#0a1929] !border-[#1e3a5f]">
      <div>
        <p className="-mt-2 mb-5 text-[10px] uppercase tracking-wide text-white/30">Simulated — no real charge</p>

        <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[12px] text-white/40">Upgrading to</p>
          <p className="font-display text-lg font-bold text-white">{planName}</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatINR(amount)}</p>
        </div>

        <button
          onClick={pay}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3395ff] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />} {busy ? "Processing…" : `Pay ${formatINR(amount)}`}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-white/25">
          <ShieldCheck size={12} /> No real credentials configured — add `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` for real payments.
        </p>
      </div>
    </Modal>
  );
}
