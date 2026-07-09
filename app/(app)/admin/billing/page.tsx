import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { listAllSubscriptions, listAllPayments, revenueByMonth } from "@/lib/db/admin/billing";
import { getAdminOverview } from "@/lib/db/admin/overview";
import RevenueCard from "@/components/admin/RevenueCard";
import AdminBillingClient from "@/components/admin/AdminBillingClient";

export const metadata: Metadata = { title: "Billing · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const [subs, payments, byMonth, overview] = await Promise.all([listAllSubscriptions(), listAllPayments(), revenueByMonth(6), getAdminOverview()]);

  return (
    <div>
      <PageHeader title="Billing" description="Subscriptions, payments and revenue across every user." icon={CreditCard} />
      <div className="mb-5">
        <RevenueCard revenueThisMonth={overview.revenueThisMonth} mrr={overview.mrr} byMonth={byMonth} />
      </div>
      <AdminBillingClient subscriptions={subs} payments={payments} />
    </div>
  );
}
