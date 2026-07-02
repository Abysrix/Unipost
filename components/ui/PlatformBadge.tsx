"use client";

import { getPlatform, type PlatformId } from "@/config/platforms";
import { cn } from "@/lib/utils";

/**
 * PlatformBadge — a platform chip tinted with its brand color.
 * Platform color is used ONLY here and in scheduler/analytics context.
 */
export default function PlatformBadge({
  platform,
  size = "md",
  showLabel = true,
  className,
}: {
  platform: PlatformId;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const p = getPlatform(platform);
  if (!p) return null;

  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 backdrop-blur-sm",
        !showLabel && "pr-1",
        className
      )}
      style={{ borderColor: `${p.color}40`, background: `${p.color}12` }}
    >
      <span
        className={cn("flex items-center justify-center rounded-full font-bold", dim)}
        style={{ background: `${p.color}22`, color: p.color }}
        aria-hidden
      >
        {p.glyph}
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-white/70">{p.name}</span>
      )}
    </span>
  );
}
