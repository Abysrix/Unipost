import { Link2, CalendarClock, HardDrive } from "lucide-react";
import type { Plan } from "@/lib/auth/role";
import type { UsageSnapshot } from "@/types/billing";
import { planLimits, formatBytes } from "@/lib/billing/plans";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import UsageProgress from "./UsageProgress";
import CreditMeter from "./CreditMeter";

/** The billing page's usage overview — credits, storage, accounts, scheduled posts. */
export default function UsageCard({ plan, usage, creditsRemaining, creditsTotal }: { plan: Plan; usage: UsageSnapshot; creditsRemaining: number; creditsTotal: number }) {
  const limits = planLimits(plan);
  return (
    <WidgetContainer title="Usage this period">
      <div className="space-y-4">
        <CreditMeter remaining={creditsRemaining} total={creditsTotal} />
        <div className="grid gap-3 sm:grid-cols-3">
          <UsageProgress icon={Link2} label="Connected accounts" current={usage.connected_accounts_count} limit={limits.maxConnectedAccounts} />
          <UsageProgress icon={CalendarClock} label="Scheduled posts" current={usage.scheduled_posts_count} limit={limits.maxScheduledPosts} />
          <UsageProgress icon={HardDrive} label="Storage" current={usage.storage_bytes_used} limit={limits.storageLimitBytes} formatValue={formatBytes} />
        </div>
      </div>
    </WidgetContainer>
  );
}
