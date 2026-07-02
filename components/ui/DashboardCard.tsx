import { cn } from "@/lib/utils";

/**
 * DashboardCard — the reusable "product surface" panel that later phases fill
 * with real UniPost UI (scheduler, analytics, AI coach). Optional browser
 * chrome sells the "this is the actual app" feeling.
 */
export default function DashboardCard({
  children,
  title,
  chrome = false,
  url = "app.unipost.bharvix.com",
  className,
}: {
  children: React.ReactNode;
  title?: string;
  chrome?: boolean;
  url?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]",
        className
      )}
      style={{ background: "rgba(9,9,16,0.96)" }}
    >
      {chrome && (
        <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="mx-auto flex h-6 w-56 items-center justify-center rounded-md bg-white/[0.04]">
            <span className="font-mono text-[9px] text-white/25">{url}</span>
          </div>
          <div className="w-8" />
        </div>
      )}
      {title && (
        <div className="border-b border-white/[0.05] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{title}</span>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
