import type { HealthCheck } from "@/types/admin";
import StatusBadge from "./StatusBadge";

export default function HealthCard({ check }: { check: HealthCheck }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-white/85">{check.label}</span>
        <StatusBadge status={check.status} size="sm" />
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">{check.message}</p>
    </div>
  );
}
