import type { Metadata } from "next";
import { Users, UserCheck, UserPlus, IndianRupee, TrendingUp, Sparkles, CalendarClock, Link2, AlertTriangle, Shield } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { getAdminOverview } from "@/lib/db/admin/overview";
import { listUnifiedTimeline } from "@/lib/db/admin/audit";
import { listAllPayments } from "@/lib/db/admin/billing";
import { formatINR } from "@/lib/billing/plans";
import { formatNumber } from "@/lib/utils";
import AdminStatCard from "@/components/admin/AdminStatCard";
import ActivityFeed from "@/components/admin/ActivityFeed";

export const metadata: Metadata = { title: "Admin Overview · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let overview: Awaited<ReturnType<typeof getAdminOverview>> | null = null;
  let timeline: Awaited<ReturnType<typeof listUnifiedTimeline>> = [];
  let recentPayments: Awaited<ReturnType<typeof listAllPayments>> = [];
  try {
    [overview, timeline, recentPayments] = await Promise.all([getAdminOverview(), listUnifiedTimeline(20), listAllPayments()]);
  } catch {
    /* admin tables not migrated yet, or SUPABASE_SERVICE_ROLE_KEY not configured */
  }

  if (!overview) {
    return (
      <div>
        <PageHeader title="Admin" description="Platform overview and operations." icon={Shield} />
        <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-white/40">
          Admin data isn&apos;t available yet — run migration <code className="text-white/60">0008_admin.sql</code> and confirm{" "}
          <code className="text-white/60">SUPABASE_SERVICE_ROLE_KEY</code> is set.
        </p>
      </div>
    );
  }

  const recentFailed = recentPayments.filter((p) => p.status === "failed").slice(0, 6);

  return (
    <div>
      <PageHeader title="Admin" description="Platform overview and operations." icon={Shield} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AdminStatCard icon={Users} label="Total users" value={formatNumber(overview.totalUsers)} accent="#2dd4bf" />
        <AdminStatCard icon={UserCheck} label="Active (7d)" value={formatNumber(overview.activeUsers7d)} accent="#22d3ee" />
        <AdminStatCard icon={UserPlus} label="New signups (7d)" value={formatNumber(overview.newSignups7d)} accent="#34d399" />
        <AdminStatCard icon={IndianRupee} label="Revenue (this month)" value={formatINR(overview.revenueThisMonth)} accent="#facc15" />
        <AdminStatCard icon={TrendingUp} label="MRR" value={formatINR(overview.mrr)} accent="#facc15" hint="Active paid plans, normalized monthly" />
        <AdminStatCard icon={Sparkles} label="AI requests today" value={formatNumber(overview.aiRequestsToday)} accent="#a78bfa" />
        <AdminStatCard icon={CalendarClock} label="Scheduled posts" value={formatNumber(overview.scheduledPostsActive)} accent="#2dd4bf" />
        <AdminStatCard icon={Link2} label="Connected accounts" value={formatNumber(overview.connectedAccountsActive)} accent="#22d3ee" />
        <AdminStatCard icon={AlertTriangle} label="Failed jobs (24h)" value={formatNumber(overview.failedJobs24h)} accent="#f87171" deltaUp={overview.failedJobs24h === 0} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <WidgetContainer title="Live activity">
          <ActivityFeed entries={timeline} />
        </WidgetContainer>

        <WidgetContainer title="Recent failed payments">
          {recentFailed.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/35">No failed payments in the recent history.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recentFailed.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-red-500/15 bg-red-500/[0.04] px-3 py-2">
                  <span className="text-[13px] text-white/70">{formatINR(p.amount)} — {p.plan}</span>
                  <span className="text-[11px] text-red-400">{p.failure_reason ?? "Failed"}</span>
                </li>
              ))}
            </ul>
          )}
        </WidgetContainer>
      </div>
    </div>
  );
}
