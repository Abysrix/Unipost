"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * InfoBanner — a dismissible announcement strip. Dismissal persists per `id`.
 * Reduced client footprint: only the dismiss state is interactive.
 */
export default function InfoBanner({
  id,
  title,
  description,
  cta,
  icon: Icon = Sparkles,
}: {
  id: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  icon?: LucideIcon;
}) {
  const [dismissed, setDismissed] = useState(true); // hidden until we check storage (avoids flash)

  useEffect(() => {
    setDismissed(localStorage.getItem(`unipost:banner:${id}`) === "1");
  }, [id]);

  if (dismissed) return null;

  return (
    <div className="relative mb-6 flex items-center gap-3 overflow-hidden rounded-xl border border-aurora-teal/20 bg-aurora-teal/[0.06] px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-aurora-teal/12">
        <Icon size={15} className="text-aurora-teal" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white">{title}</div>
        {description && <div className="truncate text-[12px] text-white/45">{description}</div>}
      </div>
      {cta && (
        <Link href={cta.href} className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]">
          {cta.label}
        </Link>
      )}
      <button
        onClick={() => {
          localStorage.setItem(`unipost:banner:${id}`, "1");
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}
