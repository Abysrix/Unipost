import type { LucideIcon } from "lucide-react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/** InsightCard — one plain-language observation tied to a metric. */
export default function InsightCard({
  icon: Icon = Lightbulb,
  title,
  description,
  accent = "#facc15",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4", className)}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${accent}18` }}>
        <Icon size={14} style={{ color: accent }} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white/90">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-white/45">{description}</p>
      </div>
    </div>
  );
}
