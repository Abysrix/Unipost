"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, History as HistoryIcon, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import type { Plan } from "@/lib/auth/role";
import type { BillingCycle, BillingBundle } from "@/types/billing";
import { formatINR, planLimits } from "@/lib/billing/plans";
import { startCheckout, confirmCheckout, retryPaymentAction } from "@/app/(app)/billing/actions";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import EmptyState from "@/components/dashboard/EmptyState";
import BillingCard from "./BillingCard";
import UsageCard from "./UsageCard";
import PlanComparison from "./PlanComparison";
import PaymentMethodCard from "./PaymentMethodCard";
import InvoiceCard from "./InvoiceCard";
import MockCheckoutModal from "./MockCheckoutModal";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingPageClient({ bundle }: { bundle: BillingBundle }) {
  const router = useRouter();
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [mockOrder, setMockOrder] = useState<{ orderId: string; planName: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function selectPlan(plan: Plan, cycle: BillingCycle) {
    setError(null);
    if (plan === "free") {
      // Downgrades happen via Cancel (access continues to period end), not checkout.
      setError('To move to Free, use "Cancel subscription" above — you\'ll keep your current plan until the period ends.');
      return;
    }
    setBusyPlan(plan);
    const order = await startCheckout(plan, cycle);
    if ("error" in order) {
      setBusyPlan(null);
      setError(order.error);
      return;
    }

    if (order.isStub) {
      setBusyPlan(null);
      setMockOrder({ orderId: order.orderId, planName: planLimits(plan).name, amount: order.amount });
      return;
    }

    const loaded = await loadRazorpayScript();
    setBusyPlan(null);
    if (!loaded || !window.Razorpay) return setError("Couldn't load the payment form. Check your connection and try again.");

    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "UniPost",
      description: `${planLimits(plan).name} — ${cycle}`,
      theme: { color: "#2dd4bf" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const res = await confirmCheckout({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature });
        if (!res.ok) setError(res.error ?? "Payment could not be confirmed.");
        else refresh();
      },
    });
    rzp.open();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-400">
          <XCircle size={15} /> {error}
        </div>
      )}

      <BillingCard subscription={bundle.subscription} onChanged={refresh} />
      <UsageCard plan={bundle.subscription.plan} usage={bundle.usage} creditsRemaining={bundle.creditsRemaining} creditsTotal={bundle.creditsTotal} />

      <WidgetContainer title="Plans">
        <PlanComparison currentPlan={bundle.subscription.plan} busyPlan={busyPlan} onSelect={selectPlan} />
      </WidgetContainer>

      <div className="grid gap-5 lg:grid-cols-2">
        <WidgetContainer title="Payment method">
          <PaymentMethodCard />
        </WidgetContainer>

        <WidgetContainer title="Invoices" icon={Receipt}>
          {bundle.invoices.length === 0 ? (
            <EmptyState compact icon={Receipt} title="No invoices yet" description="Invoices appear here after your first payment." />
          ) : (
            <div className="space-y-2">
              {bundle.invoices.map((inv) => (
                <InvoiceCard key={inv.id} invoice={inv} />
              ))}
            </div>
          )}
        </WidgetContainer>
      </div>

      <WidgetContainer title="Billing history" icon={HistoryIcon}>
        {bundle.payments.length === 0 ? (
          <EmptyState compact icon={HistoryIcon} title="No payments yet" description="Your checkout attempts will show up here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {bundle.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                {p.status === "captured" ? <CheckCircle2 size={14} className="shrink-0 text-aurora-green" /> : p.status === "failed" ? <XCircle size={14} className="shrink-0 text-red-400" /> : <RefreshCw size={14} className="shrink-0 text-white/30" />}
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">
                  {planLimits(p.plan).name} ({p.billing_cycle}) — {formatINR(p.amount)}
                </span>
                <span className="shrink-0 text-[11px] capitalize text-white/35">{p.status}</span>
                {p.status === "failed" && (
                  <button
                    onClick={async () => {
                      const order = await retryPaymentAction(p.id);
                      if ("error" in order) return setError(order.error);
                      if (order.isStub) setMockOrder({ orderId: order.orderId, planName: planLimits(p.plan).name, amount: order.amount });
                    }}
                    className="shrink-0 text-[11px] font-medium text-aurora-teal hover:opacity-80"
                  >
                    Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </WidgetContainer>

      {mockOrder && (
        <MockCheckoutModal
          orderId={mockOrder.orderId}
          planName={mockOrder.planName}
          amount={mockOrder.amount}
          onClose={() => setMockOrder(null)}
          onSuccess={() => {
            setMockOrder(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
