import { Activity, TrendingUp, Send, Sparkles, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WidgetContainer from "../WidgetContainer";
import ActivityItem from "../ActivityItem";
import EmptyState from "../EmptyState";
import { activity } from "@/lib/mock/dashboard";

const iconFor: Record<string, { icon: LucideIcon; accent: string }> = {
  milestone: { icon: TrendingUp, accent: "#facc15" },
  publish: { icon: Send, accent: "#34d399" },
  ai: { icon: Sparkles, accent: "#22d3ee" },
  schedule: { icon: CalendarClock, accent: "#2dd4bf" },
};

/** Recent activity feed. */
export default function RecentActivity() {
  return (
    <WidgetContainer title="Recent Activity" icon={Activity}>
      {activity.length === 0 ? (
        <EmptyState compact icon={Activity} title="No activity yet" description="Publish or schedule a post to get started." />
      ) : (
        <div>
          {activity.map((a, i) => {
            const meta = iconFor[a.kind] ?? { icon: Activity, accent: "#2dd4bf" };
            return (
              <ActivityItem key={i} icon={meta.icon} accent={meta.accent} time={a.time} last={i === activity.length - 1}>
                {a.text}
              </ActivityItem>
            );
          })}
        </div>
      )}
    </WidgetContainer>
  );
}
