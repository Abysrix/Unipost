import type { Metadata } from "next";
import { Bot, Flame, Trophy, TrendingUp } from "lucide-react";
import { requireUser, getCurrentUser } from "@/lib/auth/getUser";
import { getOwnProfile } from "@/lib/db/profiles";
import { syncGrowth, listRecommendations } from "@/lib/db/growth";
import { getGrowthCoachBundle } from "@/lib/ai/growthCoach";
import PageHeader from "@/components/dashboard/PageHeader";
import GrowthCoachCard from "@/components/growth/GrowthCoachCard";
import WeeklyReviewCard from "@/components/growth/WeeklyReviewCard";

export const metadata: Metadata = { title: "Growth Coach · UniPost" };
export const dynamic = "force-dynamic";

export default async function CoachPage() {
  await requireUser();
  const [bundle, profile, user] = await Promise.all([syncGrowth(), getOwnProfile(), getCurrentUser()]);
  const { stats, score } = bundle;

  // getGrowthCoachBundle may add new AI recommendations on a regeneration
  // run — bundle.recommendations was already fetched above, so re-read once
  // more rather than show a page that's one load behind its own AI output.
  const coach = user ? await getGrowthCoachBundle(user.id) : { report: null, insights: null, forecasts: [] };
  const recommendations = user ? await listRecommendations() : bundle.recommendations;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Growth Coach" description="An AI coach that reads your activity and tells you exactly what to do next." icon={Bot} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat icon={Trophy} label="Creator Score" value={`${score.score}`} accent="#facc15" />
        <Stat icon={Flame} label="Current streak" value={`${stats.currentStreak}d`} accent="#fb923c" />
        <Stat icon={TrendingUp} label="Growth (30d)" value={`${stats.followerGrowthPct30d >= 0 ? "+" : ""}${(stats.followerGrowthPct30d * 100).toFixed(1)}%`} accent="#34d399" />
      </div>

      <div className="mb-6">
        <WeeklyReviewCard report={coach.report} timezone={profile.timezone} />
      </div>

      <GrowthCoachCard recommendations={recommendations} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Trophy; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center sm:text-left">
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <Icon size={14} style={{ color: accent }} />
        <span className="font-display text-lg font-bold text-white">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-white/40">{label}</p>
    </div>
  );
}
