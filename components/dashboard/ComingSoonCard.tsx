import Link from "next/link";
import { Hammer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * ComingSoonCard — placeholder for modules not yet built. Keeps every sidebar
 * route navigable and on-brand while the feature ships in a later sprint.
 */
export default function ComingSoonCard({
  title,
  description,
  icon: Icon = Hammer,
  eta,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  eta?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-20 text-center">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />
      <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-aurora-teal/20 bg-aurora-teal/[0.06]">
        <Icon size={26} className="text-aurora-teal" strokeWidth={1.5} />
      </span>
      <span className="relative mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
        Coming soon{eta ? ` · ${eta}` : ""}
      </span>
      <h2 className="relative font-display text-xl font-bold text-white">{title}</h2>
      {description && <p className="relative mt-2 max-w-md text-sm leading-relaxed text-white/45">{description}</p>}
      <Link href="/dashboard" className="relative mt-6 rounded-full border border-white/[0.12] px-5 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">
        Back to dashboard
      </Link>
    </div>
  );
}
