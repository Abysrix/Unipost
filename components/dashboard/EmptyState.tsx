import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CTA = { label: string; href: string };

/**
 * EmptyState — the reusable "nothing here yet" block. Icon, copy, and up to two
 * CTAs. Used across empty lists (drafts, schedule, analytics, notifications…).
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  primary?: CTA;
  secondary?: CTA;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-14", className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <Icon size={22} className="text-white/40" strokeWidth={1.5} />
      </span>
      <h3 className="font-display text-base font-semibold text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-white/40">{description}</p>}
      {(primary || secondary) && (
        <div className="mt-5 flex items-center gap-3">
          {primary && (
            <Link href={primary.href} className="rounded-full px-5 py-2 text-xs font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] transition-shadow hover:shadow-[0_0_30px_rgba(45,212,191,0.3)]">
              {primary.label}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="rounded-full border border-white/[0.12] px-5 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
