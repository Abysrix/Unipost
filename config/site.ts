/**
 * UNIPOST SITE CONFIG — single source of truth for site-wide constants.
 * Nav, footer, socials and SEO defaults live here so every surface reads one source.
 */

export const siteConfig = {
  name: "UniPost",
  titleDefault: "UniPost — India's Creator Operating System",
  parent: "Bharvix",
  parentUrl: "https://bharvix.com",
  url: "https://unipost.bharvix.com",
  domain: "unipost.bharvix.com",
  tagline: "India's Creator Operating System",
  description:
    "UniPost is India's Creator Operating System — plan, create, schedule, publish, analyze, grow and monetize across every platform in one AI-native workspace.",
  locale: "en_IN",
  twitterHandle: "@unipost",
  email: "hello@unipost.bharvix.com",
  keywords: [
    "UniPost",
    "creator operating system",
    "social media scheduler India",
    "AI growth coach",
    "creator score",
    "content calendar",
    "creator economy India",
    "Bharvix",
  ],
} as const;

export type NavItem = {
  label: string;
  href: string;
  /** Flip on as each section/page ships in later phases. */
  enabled: boolean;
};

/** Primary nav — anchors resolve as sections land in later phases. */
export const mainNav: NavItem[] = [
  { label: "Features", href: "#features", enabled: false },
  { label: "Platforms", href: "#platforms", enabled: false },
  { label: "AI Coach", href: "#ai-coach", enabled: false },
  { label: "Pricing", href: "#pricing", enabled: false },
];

export const primaryCta = { label: "Get Early Access", href: "/signup" } as const;

export const footerNav = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "AI Coach", href: "#ai-coach" },
    { label: "Analytics", href: "#analytics" },
    { label: "Pricing", href: "#pricing" },
  ],
  Company: [
    { label: "Bharvix", href: "https://bharvix.com", external: true },
    { label: "About", href: "#about" },
    { label: "Careers", href: "#careers" },
  ],
  Connect: [
    { label: "Twitter / X", href: "https://twitter.com/unipost", external: true },
    { label: "Instagram", href: "https://instagram.com/unipost", external: true },
    { label: "hello@unipost.bharvix.com", href: "mailto:hello@unipost.bharvix.com" },
  ],
} as const;

export const socials = {
  twitter: "https://twitter.com/unipost",
  instagram: "https://instagram.com/unipost",
  youtube: "https://youtube.com/@unipost",
  linkedin: "https://linkedin.com/company/unipost",
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;
