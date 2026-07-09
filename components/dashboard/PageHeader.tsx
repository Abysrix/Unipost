import type { LucideIcon } from "lucide-react";

/** Page-level header — the title block at the top of every dashboard page. */
export default function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <Icon size={18} className="text-aurora-teal" strokeWidth={1.75} />
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          {description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/45">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
