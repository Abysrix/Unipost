import { CheckCircle2, Clock, Ban, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectionStatus as Status } from "@/types/integrations";

const META: Record<Status, { label: string; text: string; bg: string; icon: typeof CheckCircle2 }> = {
  connected: { label: "Connected", text: "text-aurora-green", bg: "bg-aurora-green/12", icon: CheckCircle2 },
  expired: { label: "Expired", text: "text-amber-300", bg: "bg-amber-400/12", icon: Clock },
  error: { label: "Error", text: "text-red-400", bg: "bg-red-500/12", icon: AlertTriangle },
  revoked: { label: "Revoked", text: "text-red-400", bg: "bg-red-500/12", icon: XCircle },
  disconnected: { label: "Disconnected", text: "text-white/40", bg: "bg-white/[0.05]", icon: Ban },
};

/** Connection status pill — the single reusable way to show a connection's state. */
export default function ConnectionStatus({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const m = META[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wide", m.bg, m.text, size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]")}>
      <Icon size={size === "sm" ? 9 : 11} />
      {m.label}
    </span>
  );
}
