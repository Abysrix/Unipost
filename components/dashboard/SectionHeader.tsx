import Link from "next/link";

/** In-page section header — smaller than PageHeader, with an optional action link. */
export default function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-white/40">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="shrink-0 text-xs font-medium text-aurora-teal transition-opacity hover:opacity-80">
          {action.label} →
        </Link>
      )}
    </div>
  );
}
