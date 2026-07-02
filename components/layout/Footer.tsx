"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll, type MotionValue } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { footerNav, siteConfig } from "@/config/site";

const LETTERS = "UNIPOST".split("");

function KineticLetter({ char, index, mx, my }: { char: string; index: number; mx: MotionValue<number>; my: MotionValue<number> }) {
  const depth = 6 + (index % 3) * 7;
  const dir = index % 2 === 0 ? 1 : -1;
  const x = useTransform(mx, (v) => v * depth * dir);
  const y = useTransform(my, (v) => v * depth * 0.5);
  return (
    <motion.span
      className="inline-block select-none font-display font-bold"
      style={{
        x, y,
        fontSize: "clamp(4rem, 15vw, 15rem)",
        letterSpacing: "-0.05em",
        lineHeight: 1,
        color: index % 2 === 0 ? "rgba(255,255,255,0.88)" : "transparent",
        WebkitTextStroke: index % 2 !== 0 ? "1.5px rgba(255,255,255,0.14)" : "none",
      }}
    >
      {char}
    </motion.span>
  );
}

/**
 * Footer — screen-spanning kinetic UNIPOST wordmark with per-letter cursor
 * parallax (ported from Bharvix), config-driven links, "a Bharvix product" line.
 */
export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 120, damping: 30 });
  const my = useSpring(rawY, { stiffness: 120, damping: 30 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const wordOpacity = useTransform(scrollYProgress, [0, 0.4], [0.2, 1]);

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left - rect.width / 2) / (rect.width / 2));
    rawY.set((e.clientY - rect.top - rect.height / 2) / (rect.height / 2));
  };
  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <footer ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="relative overflow-hidden border-t border-white/[0.04] pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(45,212,191,0.07) 0%, transparent 70%)" }}
      />
      <div className="container-custom relative">
        <div className="grid grid-cols-2 gap-10 border-b border-white/[0.04] pb-16 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]">
                <span className="h-2.5 w-2.5 rounded-sm bg-black/80" />
              </span>
              <span className="font-display text-base font-bold text-white">UniPost</span>
            </div>
            <p className="max-w-[200px] text-xs leading-relaxed text-white/30">{siteConfig.tagline}. One AI-native workspace.</p>
          </div>

          {Object.entries(footerNav).map(([section, links]) => (
            <div key={section}>
              <h4 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">{section}</h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => {
                  const external = "external" in link && link.external;
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="link-underline group flex items-center gap-1 text-xs text-white/40 transition-colors duration-300 hover:text-white/75"
                      >
                        {link.label}
                        {external && <ArrowUpRight size={10} className="opacity-0 transition-opacity group-hover:opacity-60" />}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-xs text-white/15">© {new Date().getFullYear()} UniPost — a Bharvix product.</p>
          <p className="font-mono text-[11px] text-white/10">Made in India ✦ For creators</p>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <motion.div style={{ opacity: wordOpacity }} className="flex items-end justify-center px-2 pt-4">
          {LETTERS.map((char, i) => (
            <KineticLetter key={i} char={char} index={i} mx={mx} my={my} />
          ))}
        </motion.div>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to top, #050508 25%, transparent 100%)" }}
        />
      </div>
    </footer>
  );
}
