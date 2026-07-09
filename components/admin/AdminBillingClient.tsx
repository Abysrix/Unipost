"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatINR, planLimits } from "@/lib/billing/plans";
import { formatDateTime } from "@/lib/schedule/timezone";
import type { Subscription, Payment } from "@/types/billing";
import { adminCancelSubscriptionAction, adminRenewSubscriptionAction, adminRecordRefundAction } from "@/app/(app)/admin/actions";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import EmptyState from "@/components/dashboard/EmptyState";
import { CreditCard, Ban, RotateCcw, Undo2 } from "lucide-react";

export default function AdminBillingClient({ subscriptions, payments }: { subscriptions: Subscription[]; payments: Payment[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<{ error?: string }>) {
    setBusyId(id);
    await fn();
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <WidgetContainer title="Active & recent subscriptions">
        {subscriptions.length === 0 ? (
          <EmptyState compact icon={CreditCard} title="No subscriptions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Cycle</th>
                  <th className="px-3 py-2">Renews</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2.5 text-white/80">{planLimits(s.plan).name}</td>
                    <td className="px-3 py-2.5 text-white/60">{s.status}{s.cancel_at_period_end ? " (canceling)" : ""}</td>
                    <td className="px-3 py-2.5 text-white/60 capitalize">{s.billing_cycle}</td>
                    <td className="px-3 py-2.5 text-white/40">{s.current_period_end ? formatDateTime(s.current_period_end) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => run(s.id, () => adminCancelSubscriptionAction(s.user_id))} disabled={busyId === s.id} className="flex items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] text-white/70 hover:border-white/25 disabled:opacity-50">
                          {busyId === s.id ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />} Cancel
                        </button>
                        <button onClick={() => run(s.id, () => adminRenewSubscriptionAction(s.user_id))} disabled={busyId === s.id} className="flex items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] text-white/70 hover:border-white/25 disabled:opacity-50">
                          <RotateCcw size={11} /> Renew
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetContainer>

      <WidgetContainer title="Payments">
        {payments.length === 0 ? (
          <EmptyState compact icon={CreditCard} title="No payments yet" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                <span className="text-[13px] text-white/75">{formatINR(p.amount)} — {planLimits(p.plan).name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${p.status === "captured" ? "bg-aurora-green/12 text-aurora-green" : p.status === "failed" ? "bg-red-500/12 text-red-400" : p.status === "refunded" ? "bg-white/[0.06] text-white/50" : "bg-amber-400/12 text-amber-300"}`}>{p.status}</span>
                <span className="text-[11px] text-white/30">{formatDateTime(p.created_at)}</span>
                {p.status === "captured" && (
                  <button
                    onClick={() => run(p.id, () => adminRecordRefundAction(p.id, "Recorded via admin panel"))}
                    disabled={busyId === p.id}
                    className="ml-auto flex items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] text-white/60 hover:border-white/25 disabled:opacity-50"
                    title="Record that a refund was processed manually in Razorpay — does not call Razorpay"
                  >
                    {busyId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Undo2 size={11} />} Record refund
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </WidgetContainer>
    </div>
  );
}
