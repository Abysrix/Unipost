"use client";

import type { LucideIcon } from "lucide-react";
import GlassCard from "./GlassCard";

/**
 * FeatureCard — a GlassCard with an accented icon, title and short body.
 * The reusable unit for feature grids in later phases.
 */
export default function FeatureCard({
  icon: Icon,
  title,
  description,
  accent = "#2dd4bf",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: string;
}) {
  return (
    <GlassCard accent={accent} className="h-full">
      <div
        className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: `${accent}18`, border: `1px solid ${accent}33` }}
      >
        <Icon size={18} style={{ color: accent }} strokeWidth={1.75} />
      </div>
      <h3 className="mb-2 font-display text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/45">{description}</p>
    </GlassCard>
  );
}
