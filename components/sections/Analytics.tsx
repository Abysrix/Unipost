"use client";

import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Eye, Users, Radar, Share2, MessageCircle } from "lucide-react";
import Section from "@/components/ui/Section";
import Eyebrow from "@/components/ui/Eyebrow";
import SectionHeading from "@/components/ui/SectionHeading";
import DashboardCard from "@/components/ui/DashboardCard";
import { useCountUp } from "@/hooks/useCountUp";
import { getPlatform, type PlatformId } from "@/config/platforms";

const kpis = [
  { icon: Eye, label: "Views", value: 2_400_000, suffix: "", short: "2.4M", delta: "+14%", accent: "#22d3ee" },
  { icon: Users, label: "Followers", value: 128_400, short: "128.4K", delta: "+3.2%", accent: "#2dd4bf" },
  { icon: Radar, label: "Reach", value: 512_000, short: "512K", delta: "+11%", accent: "#34d399" },
  { icon: Share2, label: "Shares", value: 18_200, short: "18.2K", delta: "+8%", accent: "#a3e635" },
  { icon: MessageCircle, label: "Comments", value: 42_700, short: "42.7K", delta: "+6%", accent: "#facc15" },
];

const recentPosts: { platform: PlatformId; title: string; views: string; eng: string; time: string }[] = [
  { platform: "instagram", title: "Reel · Studio setup tour", views: "128K", eng: "9.2%", time: "2h" },
  { platform: "youtube", title: "Short · How I edit in 5 min", views: "84K", eng: "7.8%", time: "6h" },
  { platform: "linkedin", title: "5 lessons from 1 year building", views: "22K", eng: "5.1%", time: "1d" },
  { platform: "x", title: "Thread · The creator stack", views: "41K", eng: "6.4%", time: "1d" },
];

const platformStats: { id: PlatformId; pct: number }[] = [
  { id: "instagram", pct: 82 },
  { id: "youtube", pct: 64 },
  { id: "linkedin", pct: 48 },
  { id: "x", pct: 71 },
];

function KpiCard({ kpi, live }: { kpi: (typeof kpis)[0]; live: boolean }) {
  const Icon = kpi.icon;
  return (
    <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-white/[0.14]">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${kpi.accent}18`, border: `1px solid ${kpi.accent}30` }}>
          <Icon size={13} style={{ color: kpi.accent }} />
        </span>
        <span className="text-[10px] font-medium" style={{ color: kpi.accent }}>{kpi.delta}</span>
      </div>
      <div className="font-display text-2xl font-bold text-white">
        {live ? <ShortCounter kpi={kpi} /> : "0"}
      </div>
      <div className="mt-0.5 text-[11px] text-white/35">{kpi.label}</div>
    </div>
  );
}

function ShortCounter({ kpi }: { kpi: (typeof kpis)[0] }) {
  // Count up the raw value, but render the short (K/M) label at the end.
  const v = useCountUp(kpi.value, { active: true, duration: 1800 });
  const done = v >= kpi.value - 1;
  if (done) return <>{kpi.short}</>;
  if (kpi.value >= 1_000_000) return <>{(v / 1_000_000).toFixed(1)}M</>;
  return <>{(v / 1000).toFixed(1)}K</>;
}

const SERIES = [22, 30, 26, 38, 44, 40, 52, 61, 57, 70, 78, 74, 88, 96];

function BigGrowthChart({ live }: { live: boolean }) {
  const W = 520, H = 200;
  const { line, area } = useMemo(() => {
    const max = Math.max(...SERIES);
    const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * W, H - (v / max) * (H - 24) - 12] as const);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i]; const [px, py] = pts[i - 1]; const cx = (px + x) / 2;
      d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
    }
    return { line: d, area: `${d} L${W},${H} L0,${H} Z` };
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">Audience Growth</span>
        <div className="flex items-center gap-2 text-[11px]"><span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-white/30">90 days</span><span className="text-aurora-green">+42%</span></div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.32" /><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" /></linearGradient>
          <linearGradient id="aLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22d3ee" /><stop offset="55%" stopColor="#34d399" /><stop offset="100%" stopColor="#facc15" /></linearGradient>
        </defs>
        <motion.path d={area} fill="url(#aFill)" initial={{ opacity: 0 }} animate={live ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.4 }} />
        <motion.path d={line} fill="none" stroke="url(#aLine)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={live ? { pathLength: 1 } : {}} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
    </div>
  );
}

function ScoreRing({ live }: { live: boolean }) {
  const R = 52, C = 2 * Math.PI * R, score = 84;
  const v = useCountUp(score, { active: live, duration: 1800 });
  const offset = C * (1 - v / 100);
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <span className="mb-3 self-start font-mono text-[11px] uppercase tracking-wider text-white/40">Performance Score</span>
      <div className="relative flex h-[132px] w-[132px] items-center justify-center">
        <svg width="132" height="132" className="-rotate-90">
          <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <circle cx="66" cy="66" r={R} fill="none" stroke="url(#aLine)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={live ? offset : C} style={{ transition: "stroke-dashoffset 0.1s linear", filter: "drop-shadow(0 0 8px rgba(45,212,191,0.5))" }} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display text-3xl font-bold text-white">{Math.round(v)}</span>
          <span className="text-[9px] uppercase tracking-wider text-white/30">Excellent</span>
        </div>
      </div>
    </div>
  );
}

function RecentPosts({ live }: { live: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <span className="mb-3 block font-mono text-[11px] uppercase tracking-wider text-white/40">Recent Posts</span>
      <div className="flex flex-col gap-2.5">
        {recentPosts.map((p, i) => {
          const pl = getPlatform(p.platform);
          return (
            <motion.div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5" initial={{ opacity: 0, y: 10 }} animate={live ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.3 + i * 0.14 }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: `${pl?.color}22`, color: pl?.color }}>{pl?.glyph}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-white/70">{p.title}</div>
                <div className="text-[10px] text-white/30">{p.time} ago</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-medium text-white">{p.views}</div>
                <div className="text-[10px] text-aurora-green">{p.eng}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformStats({ live }: { live: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <span className="mb-4 block font-mono text-[11px] uppercase tracking-wider text-white/40">Reach by Platform</span>
      <div className="flex flex-col gap-3.5">
        {platformStats.map((s, i) => {
          const pl = getPlatform(s.id);
          return (
            <div key={s.id}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2 text-white/55"><span style={{ color: pl?.color }}>{pl?.glyph}</span>{pl?.name}</span>
                <span className="text-white/40">{s.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full" style={{ background: pl?.color }} initial={{ width: 0 }} animate={live ? { width: `${s.pct}%` } : {}} transition={{ duration: 1.2, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analytics() {
  const ref = useRef(null);
  const live = useInView(ref, { once: true, margin: "-120px" });

  return (
    <Section id="analytics" overflowHidden>
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/3 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />

      <div className="mb-6"><Eyebrow index={2}>Analytics</Eyebrow></div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading lines={[{ text: "Every metric that matters." }, { text: "One living dashboard.", variant: "aurora" }]} />
        <p className="max-w-sm text-sm leading-relaxed text-white/45 md:text-right">
          Views, reach, engagement and growth across every platform — updated in
          real time, explained in plain language.
        </p>
      </div>

      <div ref={ref} className="mt-14">
        <DashboardCard chrome url="app.unipost.bharvix.com/analytics">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {kpis.map((k) => <KpiCard key={k.label} kpi={k} live={live} />)}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
            <BigGrowthChart live={live} />
            <ScoreRing live={live} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentPosts live={live} />
            <PlatformStats live={live} />
          </div>
        </DashboardCard>
      </div>
    </Section>
  );
}
