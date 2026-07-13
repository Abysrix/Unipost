import { Activity, TrendingUp, Send, AlertTriangle, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import ActivityItem from "../ActivityItem";
import EmptyState from "../EmptyState";
import { timeAgo } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/notifications/service";

// Same event taxonomy NotificationBell (Topbar) renders — reusing the real
// notifications feed here instead of a separate "activity" concept, since
// that's exactly what this widget's own name describes and this app already
// writes a real row for every event worth telling a creator about.
const ICON_FOR: Record<NotificationType, { icon: LucideIcon; accent: string }> = {
  publish_success: { icon: Send, accent: "#34d399" },
  publish_failure: { icon: AlertTriangle, accent: "#f87171" },
  analytics_ready: { icon: TrendingUp, accent: "#facc15" },
  subscription_upgraded: { icon: CreditCard, accent: "#22d3ee" },
  subscription_downgraded: { icon: CreditCard, accent: "#22d3ee" },
  payment_failed: { icon: AlertTriangle, accent: "#f87171" },
  system_alert: { icon: AlertTriangle, accent: "#facc15" },
};

/** Recent activity feed — the creator's own real recent notifications. */
export default function RecentActivity({ notifications }: { notifications: Notification[] }) {
  return (
    <WidgetContainer title="Recent Activity" icon={Activity}>
      {notifications.length === 0 ? (
        <EmptyState compact icon={Activity} title="No activity yet" description="Publish or schedule a post to get started." />
      ) : (
        <div>
          {notifications.map((n, i) => {
            const meta = ICON_FOR[n.type] ?? { icon: Activity, accent: "#2dd4bf" };
            return (
              <ActivityItem key={n.id} icon={meta.icon} accent={meta.accent} time={timeAgo(n.created_at)} last={i === notifications.length - 1}>
                {n.title}
              </ActivityItem>
            );
          })}
        </div>
      )}
    </WidgetContainer>
  );
}
