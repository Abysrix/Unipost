import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { getBillingBundle } from "@/lib/db/billing";
import PageHeader from "@/components/dashboard/PageHeader";
import BillingPageClient from "@/components/billing/BillingPageClient";
import type { BillingBundle } from "@/types/billing";

export const metadata: Metadata = { title: "Billing · UniPost" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireUser();

  let bundle: BillingBundle | null = null;
  try {
    bundle = await getBillingBundle();
  } catch {
    /* billing tables not migrated yet */
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Billing" description="Manage your plan, invoices and AI credits." icon={CreditCard} />
      {bundle ? (
        <BillingPageClient bundle={bundle} />
      ) : (
        <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-white/40">
          Billing isn&apos;t set up yet — run migration <code className="text-white/60">0007_billing.sql</code> to enable this page.
        </p>
      )}
    </div>
  );
}
