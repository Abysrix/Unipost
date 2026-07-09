import type { LucideIcon } from "lucide-react";

/** A single activity-feed row (icon, text, timestamp). */
export default function ActivityItem({
  icon: Icon,
  accent = "#2dd4bf",
  children,
  time,
  last = false,
}: {
  icon: LucideIcon;
  accent?: string;
  children: React.ReactNode;
  time: string;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {/* connector line */}
      {!last && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-white/[0.06]" />}
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
        <Icon size={13} style={{ color: accent }} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[13px] leading-snug text-white/65">{children}</p>
        <p className="mt-0.5 text-[11px] text-white/30">{time}</p>
      </div>
    </div>
  );
}
