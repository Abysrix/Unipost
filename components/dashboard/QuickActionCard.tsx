import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** QuickActionCard — a clickable action tile (icon, label, description). */
export default function QuickActionCard({
  icon: Icon,
  label,
  description,
  href,
  accent = "#2dd4bf",
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      data-cursor="pointer"
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.16]"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={17} style={{ color: accent }} strokeWidth={1.75} />
        </span>
        <ArrowUpRight size={15} className="text-white/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/50" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {description && <div className="mt-0.5 text-[12px] leading-relaxed text-white/40">{description}</div>}
      </div>
    </Link>
  );
}
