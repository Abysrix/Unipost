import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/billing";

const META: Record<SubscriptionStatus, { label: string; text: string; bg: string }> = {
  active: { label: "Active", text: "text-aurora-green", bg: "bg-aurora-green/12" },
  trialing: { label: "Trial", text: "text-aurora-cyan", bg: "bg-aurora-cyan/12" },
  past_due: { label: "Past due", text: "text-amber-300", bg: "bg-amber-400/12" },
  canceled: { label: "Canceled", text: "text-white/40", bg: "bg-white/[0.05]" },
};

/** Subscription status pill — the single reusable way to show billing state. */
export default function SubscriptionBadge({ status, size = "md" }: { status: SubscriptionStatus; size?: "sm" | "md" }) {
  const m = META[status];
  return (
    <span className={cn("inline-flex items-center rounded-full font-medium uppercase tracking-wide", m.bg, m.text, size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]")}>
      {m.label}
    </span>
  );
}
