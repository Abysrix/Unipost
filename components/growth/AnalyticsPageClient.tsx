"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Eye, Heart, Send, UserCheck, PlayCircle, Clock, Trophy, History as HistoryIcon, Lock } from "lucide-react";
import { getPlatform } from "@/config/platforms";
import { formatNumber } from "@/lib/utils";
import type { Plan } from "@/lib/auth/role";
import type { AnalyticsDay, CreatorStats, PostAnalytics } from "@/types/growth";
import type { ScheduledEvent } from "@/types/schedule";
import { dailyTotals, dailyEngagementRate, totalsByPlatform, windowSum, latestFollowersTotal, followersAsOf } from "@/lib/growth/aggregate";
import { estimatePostPerformance, type PostPerformance } from "@/lib/growth/performance";
import { maxAnalyticsRangeDays } from "@/lib/billing/gates";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricGrid from "./MetricGrid";
import AnalyticsCard from "./AnalyticsCard";
import InsightCard from "./InsightCard";
import ChartContainer, { DEFAULT_TIME_RANGES } from "@/components/charts/ChartContainer";
import TrendChart from "@/components/charts/TrendChart";
import PlatformComparison from "@/components/charts/PlatformComparison";
import PublishingTimeline from "@/components/charts/PublishingTimeline";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";

export default function AnalyticsPageClient({
  stats,
  analytics,
  scheduled,
  postAnalytics,
  plan,
}: {
  stats: CreatorStats;
  analytics: AnalyticsDay[];
  scheduled: ScheduledEvent[];
  postAnalytics: PostAnalytics[];
  plan: Plan;
}) {
  const maxDays = maxAnalyticsRangeDays(plan);
  const availableRanges = useMemo(() => DEFAULT_TIME_RANGES.filter((r) => r.days <= maxDays), [maxDays]);
  const isCapped = maxDays < 90;
  const [rangeDays, setRangeDays] = useState(() => Math.min(30, maxDays));
  const hasAnalytics = analytics.length > 0;
  const published = useMemo(() => scheduled.filter((e) => e.status === "published" && e.published_at), [scheduled]);

  const followersNow = useMemo(() => latestFollowersTotal(analytics), [analytics]);
  const followers30dAgo = useMemo(() => followersAsOf(analytics, 30), [analytics]);
  const reach30d = useMemo(() => windowSum(analytics, "reach", 30, 0), [analytics]);
  const reachPrior30d = useMemo(() => windowSum(analytics, "reach", 30, 30), [analytics]);
  const visits30d = useMemo(() => windowSum(analytics, "profile_visits", 30, 0), [analytics]);
  const visitsPrior30d = useMemo(() => windowSum(analytics, "profile_visits", 30, 30), [analytics]);
  const views30d = useMemo(() => windowSum(analytics, "views", 30, 0), [analytics]);
  const viewsPrior30d = useMemo(() => windowSum(analytics, "views", 30, 30), [analytics]);

  const growthSeries = useMemo(() => dailyTotals(analytics, "followers", rangeDays), [analytics, rangeDays]);
  const reachSeries = useMemo(() => dailyTotals(analytics, "reach", rangeDays), [analytics, rangeDays]);
  const engagementSeries = useMemo(() => dailyEngagementRate(analytics, rangeDays), [analytics, rangeDays]);
  const reachByPlatform = useMemo(() => totalsByPlatform(analytics, "reach", 30), [analytics]);

  const timeline = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const e of published) {
      const d = (e.published_at as string).slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + 1);
    }
    const days = 14;
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ date: d, count: byDate.get(d) ?? 0 });
    }
    return out;
  }, [published]);

  const heatmapDays = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const e of scheduled) {
      const created = e.created_at.slice(0, 10);
      byDate.set(created, (byDate.get(created) ?? 0) + 1);
      if (e.published_at) {
        const pub = e.published_at.slice(0, 10);
        byDate.set(pub, (byDate.get(pub) ?? 0) + 1);
      }
    }
    return Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
  }, [scheduled]);

  const realMetricsByPost = useMemo(() => new Map(postAnalytics.map((p) => [p.scheduled_post_id, p])), [postAnalytics]);
  const performance = useMemo(() => estimatePostPerformance(published, analytics, realMetricsByPost), [published, analytics, realMetricsByPost]);
  const topPosts = performance.slice(0, 5);
  const recent = useMemo(() => [...performance].sort((a, b) => (b.event.published_at ?? "").localeCompare(a.event.published_at ?? "")).slice(0, 5), [performance]);

  return (
    <div className="space-y-6">
      {isCapped && (
        <div className="flex items-center gap-2.5 rounded-xl border border-aurora-yellow/20 bg-aurora-yellow/[0.05] px-4 py-3 text-[13px] text-white/70">
          <Lock size={14} className="shrink-0 text-aurora-yellow" />
          <span className="flex-1">Your plan shows the last {maxDays} days of history.</span>
          <Link href="/billing" className="shrink-0 font-semibold text-aurora-yellow hover:opacity-80">Upgrade for more →</Link>
        </div>
      )}

      <MetricGrid columns={3}>
        <AnalyticsCard icon={Users} label="Followers" value={followersNow} previousValue={followers30dAgo} empty={!hasAnalytics} />
        <AnalyticsCard icon={Eye} label="Reach (30d)" value={reach30d} previousValue={reachPrior30d} empty={!hasAnalytics} />
        <AnalyticsCard icon={Heart} label="Engagement rate" value={Math.round(stats.engagementRate * 1000) / 10} suffix="%" decimals={1} previousValue={undefined} empty={!hasAnalytics} />
        <AnalyticsCard icon={Send} label="Posts published (30d)" value={stats.postsLast30d} empty={stats.totalPosts === 0} />
        <AnalyticsCard icon={UserCheck} label="Profile visits (30d)" value={visits30d} previousValue={visitsPrior30d} empty={!hasAnalytics} />
        <AnalyticsCard icon={PlayCircle} label="Views (30d)" value={views30d} previousValue={viewsPrior30d} empty={!hasAnalytics} />
      </MetricGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartContainer title="Growth curve" ranges={availableRanges} activeDays={rangeDays} onRangeChange={setRangeDays} empty={!hasAnalytics}>
          <TrendChart series={[{ label: "Followers", values: growthSeries.map((d) => d.value), color: "#facc15" }]} variant="area" formatValue={(n) => formatNumber(Math.round(n))} />
        </ChartContainer>
        <ChartContainer title="Engagement trend" ranges={availableRanges} activeDays={rangeDays} onRangeChange={setRangeDays} empty={!hasAnalytics}>
          <TrendChart series={[{ label: "Engagement rate", values: engagementSeries.map((d) => d.value), color: "#34d399" }]} variant="line" formatValue={(n) => `${n.toFixed(1)}%`} />
        </ChartContainer>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartContainer title="Reach trend" ranges={availableRanges} activeDays={rangeDays} onRangeChange={setRangeDays} empty={!hasAnalytics}>
          <TrendChart series={[{ label: "Reach", values: reachSeries.map((d) => d.value), color: "#22d3ee" }]} variant="area" formatValue={(n) => formatNumber(Math.round(n))} />
        </ChartContainer>
        <ChartContainer title="Platform comparison" empty={reachByPlatform.length === 0}>
          <PlatformComparison data={reachByPlatform} label="reach" />
        </ChartContainer>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartContainer title="Publishing timeline (14d)" empty={published.length === 0} emptyMessage="Publish a post to see your timeline.">
          <PublishingTimeline points={timeline} />
        </ChartContainer>
        <ChartContainer title="Content calendar activity" empty={heatmapDays.length === 0}>
          <CalendarHeatmap days={heatmapDays} />
        </ChartContainer>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard
          icon={Trophy}
          accent="#facc15"
          title={stats.bestPlatform ? `${getPlatform(stats.bestPlatform)?.name ?? stats.bestPlatform} is your top platform` : "Connect a platform to see insights"}
          description={stats.bestPlatform ? "It's driving the most reach for you over the last 30 days." : "Publish your first post to start building insights."}
        />
        <InsightCard
          icon={Clock}
          accent="#22d3ee"
          title={stats.bestPostingHour != null ? `You post most around ${formatHour(stats.bestPostingHour)}` : "No posting pattern yet"}
          description="Consistent timing helps your audience learn when to expect you."
        />
        <InsightCard
          icon={Heart}
          accent="#34d399"
          title={`${(stats.engagementRate * 100).toFixed(1)}% engagement rate`}
          description={stats.engagementRate >= 0.05 ? "That's strong — keep doing what you're doing." : "Try asking questions or replying to comments early to lift this."}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WidgetContainer title="Top performing posts" icon={Trophy}>
          {topPosts.length === 0 ? (
            <EmptyState compact icon={Trophy} title="No published posts yet" description="Publish your first post to start seeing performance." />
          ) : (
            <ul className="flex flex-col gap-2">
              {topPosts.map((p) => (
                <PerformanceRow key={p.event.id} p={p} />
              ))}
            </ul>
          )}
        </WidgetContainer>
        <WidgetContainer title="Recent performance" icon={HistoryIcon}>
          {recent.length === 0 ? (
            <EmptyState compact icon={HistoryIcon} title="Nothing published yet" description="Your most recent posts will show up here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((p) => (
                <PerformanceRow key={p.event.id} p={p} />
              ))}
            </ul>
          )}
        </WidgetContainer>
      </div>
    </div>
  );
}

function PerformanceRow({ p }: { p: PostPerformance }) {
  const platform = getPlatform(p.event.platform);
  const title = p.event.post?.title?.trim() || "Untitled post";
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: `${platform?.color}22`, color: platform?.color }}>
        {platform?.glyph}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-white/75">{title}</span>
      {p.isReal && <span title="Real data synced from the platform" className="h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-green" />}
      <span className="shrink-0 text-right font-mono text-[11px] text-white/40">
        {formatNumber(p.estimatedReach)} reach<span className="mx-1 text-white/15">·</span>{formatNumber(p.estimatedEngagement)} eng.
      </span>
    </li>
  );
}

function formatHour(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}
