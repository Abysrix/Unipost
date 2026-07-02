"use client";

import { motion } from "framer-motion";
import { RefreshCw, Check } from "lucide-react";
import Section from "@/components/ui/Section";
import Eyebrow from "@/components/ui/Eyebrow";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/motion/Reveal";
import { getPlatform, type PlatformId } from "@/config/platforms";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const connections: { id: PlatformId; followers: string; scheduled: number; sync: string }[] = [
  { id: "instagram", followers: "128.4K", scheduled: 8, sync: "2 min ago" },
  { id: "youtube", followers: "64.2K", scheduled: 3, sync: "just now" },
  { id: "linkedin", followers: "22.1K", scheduled: 5, sync: "6 min ago" },
  { id: "x", followers: "41.7K", scheduled: 12, sync: "1 min ago" },
];

function ConnectionCard({ conn, index }: { conn: (typeof connections)[0]; index: number }) {
  const p = getPlatform(conn.id)!;
  const reduced = usePrefersReducedMotion();
  return (
    <Reveal variant="fade-up" delay={index * 0.08}>
      <div
        className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1"
        style={{ boxShadow: `0 20px 60px -30px ${p.color}55` }}
      >
        {/* top color line */}
        <div className="absolute left-0 right-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${p.color}, transparent)` }} />
        {/* hover glow */}
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(circle, ${p.color}22, transparent 70%)`, filter: "blur(20px)" }} />

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold" style={{ background: `${p.color}1f`, border: `1px solid ${p.color}40`, color: p.color }}>{p.glyph}</span>
            <div>
              <div className="font-display text-base font-semibold text-white">{p.name}</div>
              <div className="text-[11px] text-white/30">@aarav.builds</div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-aurora-green/25 bg-aurora-green/10 px-2.5 py-1 text-[10px] font-medium text-aurora-green">
            <span className="relative flex h-1.5 w-1.5">
              {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora-green opacity-70" />}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora-green" />
            </span>
            Connected
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-display text-2xl font-bold text-white">{conn.followers}</div>
            <div className="text-[11px] text-white/35">Followers</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-white">{conn.scheduled}</div>
            <div className="text-[11px] text-white/35">Scheduled posts</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.05] pt-4">
          <span className="flex items-center gap-1.5 text-[11px] text-white/30"><RefreshCw size={11} /> Last sync · {conn.sync}</span>
          <span className="flex items-center gap-1 text-[11px] text-aurora-teal"><Check size={11} /> Up to date</span>
        </div>
      </div>
    </Reveal>
  );
}

export default function Platforms() {
  return (
    <Section id="platforms" overflowHidden>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(52,211,153,0.05) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="mb-6"><Eyebrow index={4}>Integrations</Eyebrow></div>
      <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading lines={[{ text: "All your platforms," }, { text: "always in sync.", variant: "aurora" }]} />
        <p className="max-w-sm text-sm leading-relaxed text-white/45 md:text-right">
          Connect once. UniPost keeps every account live, scheduled and measured
          — no more tab-switching between five apps.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connections.map((c, i) => <ConnectionCard key={c.id} conn={c} index={i} />)}
      </div>
    </Section>
  );
}
