import Link from "next/link";
import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = { robots: { index: true, follow: true } };

const LEGAL_NAV = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Data Processing", href: "/data-processing" },
];

/**
 * Legal-page shell — reads as an article, not a marketing surface: slim
 * header (logo + back-to-home), no aurora/GSAP entrance choreography (long
 * legal text needs to be readable, not performed), same Footer as the
 * landing page for continuity. Not gated — these must be reachable by
 * anyone, signed in or not.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-white/[0.06]">
        <div className="container-custom flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
              <span className="h-2.5 w-2.5 rounded-sm bg-black/80" />
            </span>
            <span className="font-display text-base font-bold text-white">UniPost</span>
          </Link>
          <Link href="/" className="text-xs font-medium text-white/50 transition-colors hover:text-white">
            ← Back to unipost.bharvix.com
          </Link>
        </div>
      </header>

      <div className="container-custom py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 flex flex-col gap-1">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">Legal</p>
              {LEGAL_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-[13px] text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <article className="max-w-[720px] text-white/70">{children}</article>
        </div>
      </div>

      <Footer />
    </div>
  );
}
