import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/getUser";
import { getOwnProfile } from "@/lib/db/profiles";
import { getCreditBalance } from "@/lib/db/billing";
import { monthlyAllotment } from "@/lib/billing/credits";
import { listConnections } from "@/lib/db/integrations";
import { syncGrowth } from "@/lib/db/growth";
import { listEvents } from "@/lib/db/schedule";
import { listDrafts } from "@/lib/db/posts";
import { listNotifications } from "@/lib/notifications/service";
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

function todayRangeIso(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function DashboardPage() {
  await requireUser();
  const { start: todayStart, end: todayEnd } = todayRangeIso();
  const [profile, creditsRemaining, connections, bundle, todayEvents, drafts, notifications] = await Promise.all([
    getOwnProfile(),
    getCreditBalance().catch(() => 0),
    listConnections(),
    syncGrowth(),
    listEvents(todayStart, todayEnd).catch(() => []),
    listDrafts().catch(() => []),
    listNotifications(5).catch(() => []),
  ]);
  const name = profile.display_name || profile.email.split("@")[0];
  const plan = profile.plan;

  const hasNoConnections = connections.length === 0;
  const recentDrafts = drafts.filter((p) => p.status === "draft").slice(0, 5);

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

      <WelcomeCard name={name} connections={connections} streak={bundle.stats.currentStreak} scheduledToday={todayEvents.length} />

      <div className="mt-6">
        <QuickActions />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <AnalyticsPreview analytics={bundle.analytics} stats={bundle.stats} hasNoConnections={hasNoConnections} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TodaySchedule events={todayEvents} />
            <RecentDrafts drafts={recentDrafts} />
          </div>
          <RecentActivity notifications={notifications} />
        </div>
        <div className="space-y-5">
          <CreatorScorePreview score={bundle.score.score} level={bundle.level.level} progress={bundle.level.progress} />
          <AITipCard />
          <SubscriptionStatus plan={plan} creditsRemaining={creditsRemaining} creditsTotal={monthlyAllotment(plan)} />
        </div>
      </div>
    </div>
  );
}
