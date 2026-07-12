import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { syncGrowth } from "@/lib/db/growth";
import { getCurrentPlan } from "@/lib/db/plan";
import PageHeader from "@/components/dashboard/PageHeader";
import AnalyticsPageClient from "@/components/growth/AnalyticsPageClient";
import SyncAnalyticsButton from "@/components/growth/SyncAnalyticsButton";

export const metadata: Metadata = { title: "Analytics · UniPost" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireUser();
  const [bundle, plan] = await Promise.all([syncGrowth(), getCurrentPlan()]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Analytics" description="Cross-platform performance, explained in plain language." icon={BarChart3} actions={<SyncAnalyticsButton />} />
      <AnalyticsPageClient stats={bundle.stats} analytics={bundle.analytics} scheduled={bundle.scheduled} postAnalytics={bundle.postAnalytics} plan={plan} />
    </div>
  );
}
