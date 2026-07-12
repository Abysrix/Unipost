import Link from "next/link";
import { CreditCard } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import CreditMeter from "@/components/billing/CreditMeter";
import type { Plan } from "@/lib/auth/role";
import { planLimits } from "@/lib/billing/plans";

/** Subscription + AI-credit usage, with an upgrade path for free users. */
export default function SubscriptionStatus({ plan, creditsRemaining, creditsTotal }: { plan: Plan; creditsRemaining: number; creditsTotal: number }) {
  const limits = planLimits(plan);
  return (
    <WidgetContainer title="Subscription" icon={CreditCard} action={{ label: "Manage", href: "/billing" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-base font-bold text-white">{limits.name}</div>
          <div className="text-[11px] text-white/55">{plan === "free" ? "Free forever" : "Renews monthly"}</div>
        </div>
        {plan === "free" && (
          <Link href="/billing" className="rounded-full px-4 py-1.5 text-xs font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">Upgrade</Link>
        )}
      </div>
      <CreditMeter remaining={creditsRemaining} total={creditsTotal} compact />
    </WidgetContainer>
  );
}
