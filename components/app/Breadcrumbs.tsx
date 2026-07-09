"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { allNavItems } from "@/config/navigation";

const labelFor = (segment: string, href: string) =>
  allNavItems.find((i) => i.href === href)?.label ??
  segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

/** Breadcrumb trail derived from the current path + nav labels. */
export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    return { href, label: labelFor(seg, href), last: i === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 sm:flex">
      {crumbs.map((c) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1.5">
          {c.last ? (
            <span className="truncate text-sm font-medium text-white/90" aria-current="page">{c.label}</span>
          ) : (
            <>
              <Link href={c.href} className="truncate text-sm text-white/40 transition-colors hover:text-white/70">{c.label}</Link>
              <ChevronRight size={13} className="shrink-0 text-white/20" />
            </>
          )}
        </span>
      ))}
    </nav>
  );
}
