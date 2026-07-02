import type { Config } from "tailwindcss";

/**
 * UniPost Tailwind theme.
 * Inherits the Bharvix system (void backgrounds, violet/indigo spectrum,
 * fluid display scale, glow shadows) and EXTENDS it with UniPost's own
 * accent layer: the Aurora ramp (cyan → green → yellow) and platform colors.
 *
 * Gradient stays rare = importance. Aurora marks the hero, the Creator Score,
 * and the primary CTA — never every surface.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Inherited Bharvix void stage */
        bg: {
          primary: "#050508",
          secondary: "#0a0a12",
          tertiary: "#0f0f1a",
          elevated: "#14141f",
        },
        /* Inherited Bharvix spectrum */
        violet: { 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
        purple: { 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce", 800: "#6b21a8", 900: "#4c1285" },
        indigo: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
        /* NEW — UniPost Aurora accent ramp */
        aurora: {
          cyan: "#22d3ee",
          teal: "#2dd4bf",
          green: "#34d399",
          lime: "#a3e635",
          yellow: "#facc15",
          amber: "#f59e0b",
        },
        /* NEW — Platform colors (used only where context requires) */
        platform: {
          instagram: "#e1306c",
          youtube: "#ff0033",
          linkedin: "#0a66c2",
          x: "#e7e9ea",
          tiktok: "#25f4ee",
          facebook: "#1877f2",
          threads: "#a1a1aa",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["clamp(3.2rem, 8.5vw, 8.5rem)", { lineHeight: "0.9", letterSpacing: "-0.04em" }],
        "display-xl": ["clamp(3rem, 7vw, 7rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-lg": ["clamp(2.5rem, 5vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "display-md": ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-sm": ["clamp(1.5rem, 3vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
      },
      spacing: {
        section: "clamp(5rem, 12vw, 10rem)",
        gutter: "clamp(1.5rem, 5vw, 4rem)",
      },
      maxWidth: {
        container: "1400px",
        "container-narrow": "1080px",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "glow-sm": "0 0 20px rgba(139, 92, 246, 0.2)",
        "glow-md": "0 0 40px rgba(139, 92, 246, 0.25)",
        "glow-lg": "0 0 80px rgba(139, 92, 246, 0.3)",
        "glow-xl": "0 0 120px rgba(139, 92, 246, 0.35)",
        "glow-aurora": "0 0 60px rgba(45, 212, 191, 0.25)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        aurora: "linear-gradient(120deg, #22d3ee 0%, #2dd4bf 30%, #34d399 55%, #a3e635 78%, #facc15 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "marquee-left": "marqueeLeft 40s linear infinite",
        "aurora-shift": "auroraShift 18s ease-in-out infinite",
        float: "float 9s ease-in-out infinite",
        "float-slow": "floatSlow 13s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marqueeLeft: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        auroraShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(1deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
