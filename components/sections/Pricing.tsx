"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import Section from "@/components/ui/Section";
import Eyebrow from "@/components/ui/Eyebrow";
import SectionHeading from "@/components/ui/SectionHeading";
import PricingCard from "@/components/ui/PricingCard";
import Toggle from "@/components/ui/Toggle";
import Reveal from "@/components/motion/Reveal";
import { pricingTiers, aiCreditsNote } from "@/config/pricing";

export default function Pricing() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const yearly = period === "yearly";

  return (
    <Section id="pricing" overflowHidden>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[720px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.07) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="flex flex-col items-center text-center">
        <div className="mb-6"><Eyebrow index={6}>Pricing</Eyebrow></div>
        <SectionHeading align="center" lines={[{ text: "Priced for creators," }, { text: "not enterprises.", variant: "aurora" }]} />
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/45">
          Start free. Upgrade when you&apos;re ready to grow. Cancel anytime — no
          contracts, no surprises.
        </p>

        <div className="mt-9">
          <Toggle
            value={period}
            onChange={setPeriod}
            options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly", hint: "−20%" }]}
          />
        </div>
      </div>

      <div className="mt-14 grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
        {pricingTiers.map((tier, i) => (
          <Reveal key={tier.name} variant="fade-up" delay={i * 0.1} className={tier.featured ? "relative md:-mt-4 md:mb-4" : ""}>
            {tier.featured && (
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(45,212,191,0.18) 0%, transparent 70%)", filter: "blur(30px)" }} />
            )}
            <PricingCard tier={tier} yearly={yearly} />
          </Reveal>
        ))}
      </div>

      {/* AI credits explainer */}
      <Reveal variant="fade-up" className="mx-auto mt-10 max-w-2xl">
        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-aurora-cyan/12" style={{ border: "1px solid rgba(34,211,238,0.25)" }}>
            <Sparkles size={14} className="text-aurora-cyan" />
          </span>
          <p className="text-left text-[13px] leading-relaxed text-white/45">{aiCreditsNote}</p>
        </div>
      </Reveal>
    </Section>
  );
}
