import type { PricingTier } from "@/types";

/**
 * Pricing tiers — INR-first, creator-focused. `priceMonthly` is the month-to-month
 * rate; `priceYearly` is the *discounted monthly-equivalent* when billed annually.
 * Creator Pro is the visual hero (featured).
 */
export const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    tagline: "For creators just getting started.",
    features: [
      "3 connected platforms",
      "30 scheduled posts / month",
      "Basic analytics",
      "50 AI credits / month",
      "Creator Score & streaks",
    ],
    cta: "Start Free",
    href: "#early-access",
  },
  {
    name: "Creator Pro",
    priceMonthly: 799,
    priceYearly: 639,
    tagline: "For serious creators growing fast.",
    features: [
      "All platforms connected",
      "Unlimited scheduling",
      "Advanced analytics & reach",
      "AI Growth Coach",
      "1,000 AI credits / month",
      "Brand deal manager",
      "XP, levels & achievements",
    ],
    cta: "Start Free Trial",
    href: "#early-access",
    featured: true,
    badge: "Most Popular",
  },
  {
    name: "Agency",
    priceMonthly: 2499,
    priceYearly: 1999,
    tagline: "For teams & creator agencies.",
    features: [
      "Everything in Creator Pro",
      "5 team seats",
      "Client workspaces",
      "White-label reports",
      "5,000 AI credits / month",
      "Priority support",
    ],
    cta: "Contact Sales",
    href: "#early-access",
  },
];

/** AI credits explainer shown under the pricing grid. */
export const aiCreditsNote =
  "AI credits power content generation, the Growth Coach, and smart suggestions. 1 credit ≈ 1 AI action — captions, ideas, replies or analytics insights.";
