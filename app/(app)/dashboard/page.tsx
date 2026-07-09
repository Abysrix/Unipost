import type { Metadata } from "next";
import { requireUser, displayName } from "@/lib/auth/getUser";
import { getPlan } from "@/lib/auth/role";
import { getCreditBalance } from "@/lib/db/billing";
import { monthlyAllotment } from "@/lib/billing/credits";
import { listConnections } from "@/lib/db/integrations";
import { syncGrowth } from "@/lib/db/growth";
import InfoBanner from "@/components/dashboard/InfoBanner";
import WelcomeCard from "@/components/dashboard/widgets/WelcomeCard";
import QuickActions from "@/components/dashboard/widgets/QuickActions";
import TodaySchedule from "@/components/dashboard/widgets/TodaySchedule";
import RecentDrafts from "@/components/dashboard/widgets/RecentDrafts";
import AnalyticsPreview from "@/components/dashboard/widgets/AnalyticsPreview";
import CreatorScorePreview from "@/components/dashboard/widgets/CreatorScorePreview";
import AITipCard from "@/components/dashboard/widgets/AITipCard";
import RecentActivity from "@/components/dashboard/widgets/RecentActivity";
import SubscriptionStatus from "@/components/dashboard/widgets/SubscriptionStatus";

export const metadata: Metadata = { title: "Dashboard · UniPost" };

export default async function DashboardPage() {
  const user = await requireUser();
  const name = displayName(user);
  const plan = getPlan(user);
  const creditsRemaining = await getCreditBalance().catch(() => 0);
  const [connections, bundle] = await Promise.all([
    listConnections(),
    syncGrowth(),
  ]);

  const hasNoConnections = connections.length === 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      {hasNoConnections && (
        <InfoBanner
          id="welcome-v1"
          title="Welcome to UniPost 🎉"
          description="Your Creator OS is ready. Connect a platform to start publishing everywhere."
          cta={{ label: "Connect", href: "/integrations" }}
        />
      )}

      <WelcomeCard name={name} connections={connections} />

      <div className="mt-6">
        <QuickActions />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <AnalyticsPreview analytics={bundle.analytics} stats={bundle.stats} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TodaySchedule />
            <RecentDrafts />
          </div>
          <RecentActivity />
        </div>
        <div className="space-y-5">
          <CreatorScorePreview />
          <AITipCard />
          <SubscriptionStatus plan={plan} creditsRemaining={creditsRemaining} creditsTotal={monthlyAllotment(plan)} />
        </div>
      </div>
    </div>
  );
}
