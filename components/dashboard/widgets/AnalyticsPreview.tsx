import { BarChart3 } from "lucide-react";
import Link from "next/link";
import WidgetContainer from "../WidgetContainer";
import type { AnalyticsDay, CreatorStats } from "@/types/growth";
import { latestFollowersTotal, followersAsOf, windowSum, dailyTotals } from "@/lib/growth/aggregate";

const W = 300, H = 72;

function buildPath(series: number[]) {
  if (series.length === 0) return { line: "", area: "" };
  const rawMax = Math.max(...series);
  const max = rawMax <= 0 ? 1 : rawMax;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - (v / max) * (H - 10) - 5] as const);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]; const [px, py] = pts[i - 1]; const cx = (px + x) / 2;
    d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
  }
  return { line: d, area: `${d} L${W},${H} L0,${H} Z` };
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

interface AnalyticsPreviewProps {
  analytics?: AnalyticsDay[];
  stats?: CreatorStats;
}

/** Analytics snapshot — live performance stats + sparkline, falls back to blurred mock-up if no connections exist. */
export default function AnalyticsPreview({ analytics = [], stats }: AnalyticsPreviewProps) {
  const hasNoData = analytics.length === 0;

  // Real KPIs calculations
  const followersNow = latestFollowersTotal(analytics);
  const followers30dAgo = followersAsOf(analytics, 30);
  const followersDiff = followersNow - followers30dAgo;
  const followersDelta = followers30dAgo > 0 ? (followersDiff / followers30dAgo) * 100 : 0;

  const reach30d = windowSum(analytics, "reach", 30, 0);
  const reachPrior30d = windowSum(analytics, "reach", 30, 30);
  const reachDiff = reach30d - reachPrior30d;
  const reachDelta = reachPrior30d > 0 ? (reachDiff / reachPrior30d) * 100 : 0;

  const likes30d = windowSum(analytics, "likes", 30, 0);
  const comments30d = windowSum(analytics, "comments", 30, 0);
  const shares30d = windowSum(analytics, "shares", 30, 0);
  const saves30d = windowSum(analytics, "saves", 30, 0);
  const eng30d = likes30d + comments30d + shares30d + saves30d;

  const likesPrior30d = windowSum(analytics, "likes", 30, 30);
  const commentsPrior30d = windowSum(analytics, "comments", 30, 30);
  const sharesPrior30d = windowSum(analytics, "shares", 30, 30);
  const savesPrior30d = windowSum(analytics, "saves", 30, 30);
  const engPrior30d = likesPrior30d + commentsPrior30d + sharesPrior30d + savesPrior30d;

  const engDiff = eng30d - engPrior30d;
  const engDelta = engPrior30d > 0 ? (engDiff / engPrior30d) * 100 : 0;
  const engagementNow = stats ? stats.engagementRate * 100 : 0;

  // Real 14d daily reach sparkline, fall back to mock trend if empty
  const sparklineData = hasNoData
    ? [22, 28, 26, 34, 40, 38, 47, 55, 52, 63, 70, 76, 84, 92]
    : dailyTotals(analytics, "reach", 14).map((d) => d.value);

  const { line, area } = buildPath(sparklineData);

  const displayKpis = [
    {
      key: "followers",
      label: "Followers",
      value: hasNoData ? "128.4K" : formatCompact(followersNow),
      delta: hasNoData ? "3.2%" : `${Math.abs(followersDelta).toFixed(1)}%`,
      up: hasNoData ? true : followersDelta >= 0,
    },
    {
      key: "reach",
      label: "Reach (30d)",
      value: hasNoData ? "512K" : formatCompact(reach30d),
      delta: hasNoData ? "11%" : `${Math.abs(reachDelta).toFixed(1)}%`,
      up: hasNoData ? true : reachDelta >= 0,
    },
    {
      key: "engagement",
      label: "Engagement",
      value: hasNoData ? "6.8%" : `${engagementNow.toFixed(1)}%`,
      delta: hasNoData ? "0.6%" : `${Math.abs(engDelta).toFixed(1)}%`,
      up: hasNoData ? true : engDelta >= 0,
    },
  ];

  return (
    <WidgetContainer title="Analytics" icon={BarChart3} action={{ label: "View all", href: "/analytics" }}>
      <div className="relative mt-2">
        {hasNoData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/55 backdrop-blur-[3.5px] p-4 text-center">
            <p className="text-[13px] font-semibold text-white/95">Connect a social channel to view live analytics</p>
            <p className="mt-1 text-[11px] text-white/55 max-w-[260px]">
              Once connected, we will fetch and reflect your reach, followers, and engagement rates here.
            </p>
            <Link
              href="/integrations"
              data-cursor="pointer"
              className="mt-3.5 rounded-full bg-aurora-teal px-4 py-1.5 text-xs font-semibold text-black transition-all hover:opacity-85 hover:shadow-[0_0_12px_rgba(45,212,191,0.2)]"
            >
              Connect account
            </Link>
          </div>
        )}

        <div className={hasNoData ? "blur-[1.5px] pointer-events-none select-none" : ""}>
          <div className="grid grid-cols-3 gap-3">
            {displayKpis.map((k) => (
              <div key={k.key}>
                <div className="font-display text-lg font-bold text-white">{k.value}</div>
                <div className="text-[11px] text-white/50">{k.label}</div>
                <div className={`text-[11px] ${k.up ? "text-aurora-green" : "text-red-400"}`}>
                  {k.up ? "↑" : "↓"} {k.delta}
                </div>
              </div>
            ))}
          </div>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4">
            <defs>
              <linearGradient id="dashPrevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="dashPrevLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#dashPrevFill)" />
            <path d={line} fill="none" stroke="url(#dashPrevLine)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </WidgetContainer>
  );
}
