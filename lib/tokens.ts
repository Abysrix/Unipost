/**
 * UNIPOST DESIGN TOKENS — the JS single source of truth.
 * Inherits Bharvix's system and extends it with the Aurora + platform layer.
 * Mirrors tailwind.config.ts and globals.css. Never hard-code a raw value in a
 * component — reference a token (needed for Three.js, canvas, inline styles).
 */

/* ============================================================ COLOR */
export const color = {
  /* The void — inherited from Bharvix */
  void: { 0: "#050508", 1: "#0a0a12", 2: "#0f0f1a", 3: "#14141f" },

  /* Inherited signature spectrum */
  violet: { 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
  indigo: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },

  /* NEW — UniPost Aurora ramp (cyan → green → yellow) */
  aurora: {
    cyan: "#22d3ee",
    teal: "#2dd4bf",
    green: "#34d399",
    lime: "#a3e635",
    yellow: "#facc15",
    amber: "#f59e0b",
  },

  /* NEW — Platform colors (contextual only) */
  platform: {
    instagram: "#e1306c",
    youtube: "#ff0033",
    linkedin: "#0a66c2",
    x: "#e7e9ea",
    tiktok: "#25f4ee",
    facebook: "#1877f2",
    threads: "#a1a1aa",
  },

  /* Text opacity ladder — the discipline that reads premium */
  text: {
    pure: "#f8f8ff",
    primary: "rgba(248,248,255,0.90)",
    secondary: "rgba(248,248,255,0.55)",
    body: "rgba(248,248,255,0.42)",
    muted: "rgba(248,248,255,0.30)",
    faint: "rgba(248,248,255,0.16)",
  },

  border: {
    hairline: "rgba(255,255,255,0.08)",
    hover: "rgba(255,255,255,0.16)",
    accent: "rgba(139,92,246,0.30)",
    aurora: "rgba(45,212,191,0.30)",
  },
  glass: {
    fill: "rgba(255,255,255,0.03)",
    fillHover: "rgba(255,255,255,0.06)",
  },
} as const;

/** Text-opacity ladder — do not invent intermediate values. */
export const textLadder = {
  headline: 0.9,
  subhead: 0.55,
  body: 0.42,
  meta: 0.3,
  faint: 0.16,
} as const;

/* ============================================================ SPACE / RADIUS */
export const space = {
  section: "clamp(5rem, 12vw, 10rem)",
  gutter: "clamp(1.5rem, 5vw, 4rem)",
  containerMax: "1400px",
  containerNarrow: "1080px",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  full: "9999px",
} as const;

/* ============================================================ TYPOGRAPHY */
export const font = {
  display: "var(--font-display)", // Syne
  sans: "var(--font-sans)", // Plus Jakarta Sans
  mono: "var(--font-mono)", // Space Mono
} as const;

/** Fluid display scale — [size, lineHeight, letterSpacing] */
export const typeScale = {
  display2xl: ["clamp(3.2rem, 8.5vw, 8.5rem)", "0.9", "-0.04em"],
  displayXl: ["clamp(3rem, 7vw, 7rem)", "0.95", "-0.04em"],
  /** The unified SECTION-heading size (fixes Bharvix's drift). */
  section: ["clamp(2.5rem, 5vw, 5rem)", "1", "-0.04em"],
  displayMd: ["clamp(2rem, 4vw, 3.5rem)", "1.05", "-0.02em"],
  cardTitle: ["clamp(1.5rem, 3vw, 2.5rem)", "1.1", "-0.015em"],
  body: ["1rem", "1.6", "0"],
  label: ["0.7rem", "1", "0.18em"],
} as const;

export const stroke = {
  white: "1.5px rgba(255,255,255,0.22)",
  violet: "1.5px rgba(139,92,246,0.45)",
  aurora: "1.5px rgba(45,212,191,0.45)",
} as const;

/* ============================================================ SHADOW / GRADIENT */
export const shadow = {
  glowSm: "0 0 20px rgba(139,92,246,0.20)",
  glowMd: "0 0 40px rgba(139,92,246,0.25)",
  glowLg: "0 0 80px rgba(139,92,246,0.30)",
  glowAurora: "0 0 60px rgba(45,212,191,0.25)",
  glass: "0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
  elevation: "0 20px 60px rgba(0,0,0,0.5)",
} as const;

export const gradient = {
  glowViolet: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
  glowAurora: "radial-gradient(circle, rgba(45,212,191,0.16) 0%, transparent 70%)",
  glowCyan: "radial-gradient(circle, rgba(34,211,238,0.16) 0%, transparent 70%)",
  /* Text gradients (clip to text) */
  textViolet: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 40%, #6366f1 100%)",
  textAurora: "linear-gradient(120deg, #22d3ee 0%, #34d399 55%, #facc15 100%)",
  /* The aurora sweep — the product's signature gradient */
  aurora: "linear-gradient(120deg, #22d3ee 0%, #2dd4bf 30%, #34d399 55%, #a3e635 78%, #facc15 100%)",
} as const;

/* ============================================================ MOTION */
export const ease = {
  expo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  quart: [0.76, 0, 0.24, 1] as [number, number, number, number],
  back: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  soft: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
} as const;

export const duration = { fast: 0.45, base: 0.7, slow: 1.0, cinematic: 1.4 } as const;
export const stagger = { tight: 0.07, base: 0.09, loose: 0.14 } as const;

export const spring = {
  cursorDot: { stiffness: 1400, damping: 55, mass: 0.35 },
  cursorRing: { stiffness: 160, damping: 22, mass: 0.7 },
  magnetic: { stiffness: 200, damping: 18, mass: 0.6 },
  tilt: { stiffness: 150, damping: 18, mass: 0.6 },
  nav: { type: "spring", bounce: 0.12, duration: 0.6 },
} as const;

/* ============================================================ GLASS / NOISE / GRID */
export const glass = {
  background: color.glass.fill,
  border: `1px solid ${color.border.hairline}`,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as const;

export const noise = {
  url: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
  opacity: 0.035,
} as const;

export const background = {
  grid: {
    image:
      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    size: "80px 80px",
    mask: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
  },
} as const;

export const icon = {
  strokeWidth: 1.75,
  size: { xs: 10, sm: 13, base: 14, md: 16, lg: 20 },
} as const;

export const z = {
  base: 0,
  grid: 2,
  content: 10,
  nav: 100,
  scrollProgress: 90,
  overlay: 500,
  modal: 1000,
  cursorRing: 9998,
  cursorDot: 9999,
  loader: 10000,
} as const;

export const tokens = {
  color, textLadder, space, radius, font, typeScale, stroke,
  shadow, gradient, ease, duration, stagger, spring, glass, noise, background, icon, z,
} as const;

export default tokens;
