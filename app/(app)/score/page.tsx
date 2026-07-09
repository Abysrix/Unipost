import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { syncGrowth } from "@/lib/db/growth";
import PageHeader from "@/components/dashboard/PageHeader";
import ScorePageClient from "@/components/growth/ScorePageClient";

export const metadata: Metadata = { title: "Creator Score · UniPost" };
export const dynamic = "force-dynamic";

export default async function ScorePage() {
  await requireUser();
  const bundle = await syncGrowth();

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Creator Score" description="XP, levels, achievements and streaks — earned from what you actually do." icon={Trophy} />
      <ScorePageClient
        score={bundle.score}
        scoreHistory={bundle.scoreHistory}
        level={bundle.level}
        stats={bundle.stats}
        unlockedAchievements={bundle.unlockedAchievements}
        goals={bundle.goals}
      />
    </div>
  );
}
