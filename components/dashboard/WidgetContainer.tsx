import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WidgetContainer — the titled glass panel every dashboard widget lives in.
 * The single source of card chrome (border, blur, header, optional action link).
 */
export default function WidgetContainer({
  title,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} className="text-white/40" strokeWidth={1.75} />}
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          {action && (
            <Link href={action.href} className="shrink-0 text-xs font-medium text-aurora-teal transition-opacity hover:opacity-80">
              {action.label}
            </Link>
          )}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
