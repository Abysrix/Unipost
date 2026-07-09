import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/schedule/status";
import type { LifecycleStatus } from "@/types/schedule";

/** Status pill — the single reusable way to show any lifecycle state. */
export default function PublishingStatus({
  status,
  size = "md",
  showIcon = true,
  className,
}: {
  status: LifecycleStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}) {
  const m = statusMeta(status);
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wide",
        m.bg,
        m.text,
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      {showIcon && <Icon size={size === "sm" ? 9 : 11} className={status === "publishing" ? "animate-spin" : ""} />}
      {m.label}
    </span>
  );
}

/** A bare colored dot for dense calendar cells. */
export function StatusDot({ status, className }: { status: LifecycleStatus; className?: string }) {
  const m = statusMeta(status);
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", className)} style={{ background: m.hex }} aria-label={m.label} />;
}
