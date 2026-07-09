import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformPermission } from "@/types/integrations";

/** One granted/not-granted OAuth scope row. */
export default function PermissionCard({ permission }: { permission: PlatformPermission }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", permission.granted ? "border-white/[0.06] bg-white/[0.02]" : "border-red-500/15 bg-red-500/[0.03]")}>
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", permission.granted ? "bg-aurora-green/15 text-aurora-green" : "bg-red-500/15 text-red-400")}>
        {permission.granted ? <Check size={11} /> : <X size={11} />}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-white/70">{permission.scope}</span>
      {!permission.granted && <span className="shrink-0 text-[10px] text-red-400/70">Not granted</span>}
    </div>
  );
}
