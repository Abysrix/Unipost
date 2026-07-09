import { AlertTriangle } from "lucide-react";
import { getPlatform } from "@/config/platforms";
import type { PlatformValidation } from "@/lib/validations/post";

/** One advisory line per over-limit platform. Renders nothing when valid. */
export default function ValidationMessage({ v }: { v: PlatformValidation }) {
  if (v.ok) return null;
  const p = getPlatform(v.platform);
  const msg =
    v.over > 0
      ? `${v.over} character${v.over === 1 ? "" : "s"} over ${p?.name}'s ${v.limit.toLocaleString("en-IN")} limit`
      : `${v.mediaOver} too many attachment${v.mediaOver === 1 ? "" : "s"} for ${p?.name}`;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
      <AlertTriangle size={12} className="shrink-0" />
      <span style={{ color: p?.color }}>{p?.name}</span>
      <span className="text-amber-400/80">— {msg}</span>
    </div>
  );
}
