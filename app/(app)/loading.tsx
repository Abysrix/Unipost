import { SkeletonStats, SkeletonCard } from "@/components/dashboard/Skeleton";

/** Route-level loading UI for the app group — a shimmering dashboard skeleton. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 h-24 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.02]" />
      <SkeletonStats count={4} />
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={3} />
        </div>
        <div className="space-y-5">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      </div>
    </div>
  );
}
