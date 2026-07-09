import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/types/admin";

const META: Record<HealthStatus, { label: string; text: string; bg: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: "Healthy", text: "text-aurora-green", bg: "bg-aurora-green/12", icon: CheckCircle2 },
  warning: { label: "Warning", text: "text-amber-300", bg: "bg-amber-400/12", icon: AlertTriangle },
  critical: { label: "Critical", text: "text-red-400", bg: "bg-red-500/12", icon: XCircle },
  unknown: { label: "Unknown", text: "text-white/40", bg: "bg-white/[0.05]", icon: HelpCircle },
};

/** Health/status pill — the one reusable way to show Healthy/Warning/Critical/Unknown. */
export default function StatusBadge({ status, size = "md" }: { status: HealthStatus; size?: "sm" | "md" }) {
  const m = META[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wide", m.bg, m.text, size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]")}>
      <Icon size={size === "sm" ? 9 : 11} />
      {m.label}
    </span>
  );
}
