import type { Metadata } from "next";
import { Sparkles, Clock, AlertTriangle, IndianRupee } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import WidgetContainer from "@/components/dashboard/WidgetContainer";
import { getAiMonitoringSummary } from "@/lib/db/admin/ai";
import { AI_ACTIONS } from "@/lib/ai/prompts";
import type { AIActionId } from "@/lib/ai/prompts";
import AdminStatCard from "@/components/admin/AdminStatCard";
import TrendChart from "@/components/charts/TrendChart";
import BarChart from "@/components/charts/BarChart";

export const metadata: Metadata = { title: "AI Usage · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const summary = await getAiMonitoringSummary(14);

  return (
    <div>
      <PageHeader title="AI Usage" description="Requests, cost and reliability across every user's AI activity." icon={Sparkles} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCard icon={Sparkles} label="Requests today" value={String(summary.requestsToday)} accent="#a78bfa" />
        <AdminStatCard icon={Clock} label="Avg. response time" value={summary.avgDurationMs != null ? `${(summary.avgDurationMs / 1000).toFixed(1)}s` : "—"} accent="#22d3ee" />
        <AdminStatCard icon={AlertTriangle} label="Failure rate (7d)" value={`${(summary.failureRate7d * 100).toFixed(1)}%`} accent="#f87171" deltaUp={summary.failureRate7d < 0.05} />
        <AdminStatCard icon={IndianRupee} label="Est. cost this month" value={`₹${summary.estimatedCostThisMonth.toFixed(2)}`} accent="#facc15" hint="Rough estimate — not a real bill" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WidgetContainer title="Daily requests (14d)">
          <TrendChart
            series={[
              { label: "Generations", values: summary.dailySeries.map((d) => d.generations), color: "#a78bfa" },
              { label: "Chat replies", values: summary.dailySeries.map((d) => d.chatMessages), color: "#22d3ee" },
            ]}
            variant="line"
          />
        </WidgetContainer>

        <WidgetContainer title="Popular actions">
          {summary.popularActions.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/35">No AI activity in this window yet.</p>
          ) : (
            <BarChart
              data={summary.popularActions.map((a) => ({ label: AI_ACTIONS[a.action as AIActionId]?.label ?? a.action, value: a.count }))}
              height={140}
            />
          )}
        </WidgetContainer>
      </div>
    </div>
  );
}
