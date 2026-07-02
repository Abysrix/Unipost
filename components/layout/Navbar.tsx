"use client";

import { useEffect, useState } from "react";
import { motion, useScroll } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLenis } from "@/hooks/useLenis";
import { useMagnetic } from "@/hooks/useMagnetic";
import { mainNav, primaryCta } from "@/config/site";

/**
 * Navbar — floating glass pill (ported from Bharvix), re-themed for UniPost.
 * Logo lockup "UniPost · by Bharvix", config-driven links, magnetic aurora CTA,
 * shrinks + darkens on scroll. Reveals after the loader lifts.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const { scrollY } = useScroll();
  const cta = useMagnetic<HTMLAnchorElement>({ strength: 0.35 });

  useEffect(() => scrollY.on("change", (y) => setScrolled(y > 60)), [scrollY]);

  const onNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target as HTMLElement, { offset: -100, duration: 1.4 });
      else target.scrollIntoView({ behavior: "smooth" });
      setActive(href);
    }
  };

  return (
    <motion.nav
      className="fixed left-0 right-0 top-0 z-[100] flex justify-center pt-5"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border p-2 transition-all duration-500",
          scrolled
            ? "border-white/[0.08] bg-black/50 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-white/[0.06] bg-white/[0.03] backdrop-blur-md"
        )}
      >
        {/* Logo lockup */}
        <a href="/" className="group mr-2 flex items-center gap-2 px-3 py-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
            <span className="h-2 w-2 rounded-sm bg-black/80" />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-sm font-bold tracking-wide text-white/90">UniPost</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">by Bharvix</span>
          </span>
        </a>

        <div className="mx-1 h-4 w-px bg-white/10" />

        {/* Links */}
        <div className="hidden items-center md:flex">
          {mainNav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => onNav(e, link.href)}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                active === link.href ? "text-white" : "text-white/50 hover:text-white/90"
              )}
            >
              {active === link.href && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full bg-white/[0.07]"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </a>
          ))}
        </div>

        <div className="mx-1 hidden h-4 w-px bg-white/10 md:block" />

        {/* CTA */}
        <motion.a
          ref={cta.ref}
          href={primaryCta.href}
          onClick={(e) => onNav(e, primaryCta.href)}
          style={{ x: cta.x, y: cta.y }}
          {...cta.bind}
          data-cursor-label="Join"
          className="group ml-1 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]"
        >
          <span>{primaryCta.label}</span>
          <ArrowUpRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.a>
      </div>
    </motion.nav>
  );
}
