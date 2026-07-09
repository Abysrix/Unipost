"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/schedule/timezone";
import { planLimits } from "@/lib/billing/plans";
import type { Subscription } from "@/types/billing";
import { cancelSubscriptionAction, reactivateSubscriptionAction } from "@/app/(app)/billing/actions";
import SubscriptionBadge from "./SubscriptionBadge";

/** The current-plan summary card at the top of the billing page. */
export default function BillingCard({ subscription, onChanged }: { subscription: Subscription; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const limits = planLimits(subscription.plan);

  async function cancel() {
    if (!window.confirm("Cancel your subscription? You'll keep access until the end of the current period, then move to Free.")) return;
    setBusy(true);
    await cancelSubscriptionAction();
    setBusy(false);
    onChanged();
  }
  async function reactivate() {
    setBusy(true);
    await reactivateSubscriptionAction();
    setBusy(false);
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl font-bold text-white">{limits.name}</h2>
            <SubscriptionBadge status={subscription.status} />
          </div>
          <p className="mt-1 text-[13px] text-white/45">
            {subscription.plan === "free" ? "Free forever — no card required." : subscription.cancel_at_period_end ? "Cancels at the end of the current period." : `Renews ${subscription.current_period_end ? formatDateTime(subscription.current_period_end) : "automatically"}.`}
          </p>
        </div>

        {subscription.plan !== "free" && (
          <button
            onClick={subscription.cancel_at_period_end ? reactivate : cancel}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-white/[0.12] px-4 py-2 text-[13px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {subscription.cancel_at_period_end ? "Resume subscription" : "Cancel subscription"}
          </button>
        )}
      </div>
    </div>
  );
}
