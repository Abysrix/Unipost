/** Shared UniPost types used across components and config. */

import type { LucideIcon } from "lucide-react";

export type { Platform, PlatformId } from "@/config/platforms";

/** A product feature, used by FeatureCard and section data. */
export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Accent color (hex) — usually violet or an aurora stop. */
  accent?: string;
}

/** A pricing tier, used by PricingCard. */
export interface PricingTier {
  name: string;
  priceMonthly: number; // in INR
  priceYearly?: number;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  badge?: string;
}

/** A single analytics/stat datum, used by AnimatedCounter surfaces. */
export interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  accent?: string;
}
