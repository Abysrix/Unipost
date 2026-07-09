"use client";

import { Check, Loader2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { Plan } from "@/lib/auth/role";
import type { BillingCycle } from "@/types/billing";
import { planLimits, formatBytes, UNLIMITED } from "@/lib/billing/plans";

export default function PlanCard({
  plan,
  cycle,
  current,
  busy = false,
  onSelect,
}: {
  plan: Plan;
  cycle: BillingCycle;
  /** Is this the user's current plan? */
  current: boolean;
  busy?: boolean;
  onSelect: (plan: Plan) => void;
}) {
  const limits = planLimits(plan);
  const price = cycle === "yearly" ? limits.priceYearly : limits.priceMonthly;
  const rows = [
    `${formatNumber(limits.aiCreditsPerMonth)} AI credits / month`,
    `${limits.maxConnectedAccounts === UNLIMITED ? "Unlimited" : limits.maxConnectedAccounts} connected accounts`,
    `${limits.maxScheduledPosts === UNLIMITED ? "Unlimited" : formatNumber(limits.maxScheduledPosts)} scheduled posts`,
    `${limits.analyticsRangeDays}-day analytics history`,
    `${formatBytes(limits.storageLimitBytes)} storage`,
    ...(limits.teamSeats > 1 ? [`${limits.teamSeats} team seats`] : []),
    ...(limits.prioritySupport ? ["Priority support"] : []),
  ];

  return (
    <div className={cn("flex flex-col rounded-2xl border p-6", plan === "pro" ? "border-aurora-teal/30 bg-aurora-teal/[0.04]" : "border-white/[0.08] bg-white/[0.02]")}>
      {plan === "pro" && <span className="mb-3 w-fit rounded-full bg-aurora-teal/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-aurora-teal">Most Popular</span>}
      <h3 className="font-display text-lg font-bold text-white">{limits.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-white">{price === 0 ? "Free" : `₹${formatNumber(price)}`}</span>
        {price > 0 && <span className="text-sm text-white/35">/mo</span>}
      </div>
      {cycle === "yearly" && price > 0 && <p className="mt-0.5 text-[11px] text-aurora-green">Billed yearly</p>}

      <ul className="my-5 flex-1 space-y-2.5">
        {rows.map((r) => (
          <li key={r} className="flex items-start gap-2 text-[13px] text-white/65">
            <Check size={14} className="mt-0.5 shrink-0 text-aurora-teal" /> {r}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={current || busy}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60",
          current ? "border border-white/[0.12] text-white/50" : "text-black hover:opacity-90 [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]",
        )}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        {current ? "Current plan" : plan === "free" ? "Downgrade" : "Upgrade"}
      </button>
    </div>
  );
}
