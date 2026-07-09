import { cn } from "@/lib/utils";

/** MetricGrid — the responsive grid every row of AnalyticsCards renders in. */
export default function MetricGrid({ children, columns = 4, className }: { children: React.ReactNode; columns?: 3 | 4 | 5 | 6; className?: string }) {
  const cols = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5", 6: "sm:grid-cols-3 lg:grid-cols-6" }[columns];
  return <div className={cn("grid grid-cols-2 gap-3", cols, className)}>{children}</div>;
}
