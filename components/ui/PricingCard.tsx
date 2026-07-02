"use client";

import { Check } from "lucide-react";
import type { PricingTier } from "@/types";
import { formatNumber } from "@/lib/utils";
import Button from "./Button";
import GlassCard from "./GlassCard";
import GradientBorder from "./GradientBorder";

/**
 * PricingCard — INR-first pricing tier. The `featured` tier gets an aurora
 * gradient border + aurora CTA (gradient = importance).
 */
export default function PricingCard({ tier, yearly = false }: { tier: PricingTier; yearly?: boolean }) {
  const price = yearly && tier.priceYearly != null ? tier.priceYearly : tier.priceMonthly;
  const saves =
    yearly && tier.priceYearly != null && tier.priceMonthly > 0
      ? Math.round((1 - tier.priceYearly / tier.priceMonthly) * 100)
      : 0;

  const body = (
    <div className="flex h-full flex-col p-7">
      {tier.badge && (
        <span className="mb-4 inline-flex w-fit rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-aurora-teal">
          {tier.badge}
        </span>
      )}
      <h3 className="font-display text-xl font-bold text-white">{tier.name}</h3>
      <p className="mt-1 text-sm text-white/45">{tier.tagline}</p>

      <div className="mt-6 flex items-end gap-1">
        <span className="font-display text-4xl font-bold text-white">₹{formatNumber(price)}</span>
        <span className="mb-1 text-sm text-white/40">/mo</span>
      </div>
      <div className="mt-1 h-4 text-[11px] text-aurora-teal">
        {saves > 0 ? `Billed annually · save ${saves}%` : yearly ? "" : " "}
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
            <Check size={15} className="mt-0.5 shrink-0 text-aurora-green" strokeWidth={2} />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          href={tier.href}
          variant={tier.featured ? "aurora" : "secondary"}
          size="md"
          arrow
          className="w-full justify-center"
          cursorLabel="Start"
        >
          {tier.cta}
        </Button>
      </div>
    </div>
  );

  if (tier.featured) {
    return (
      <GradientBorder variant="aurora" radius="1rem" className="h-full">
        <div className="h-full">{body}</div>
      </GradientBorder>
    );
  }
  return <GlassCard tilt={false} padding="p-0" className="h-full">{body}</GlassCard>;
}
