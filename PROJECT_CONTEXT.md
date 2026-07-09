# PROJECT_CONTEXT.md
### UniPost AI — a Bharvix product · single source of truth (the "what & why")

> Read this, `PROJECT_STATUS.md` and `ARCHITECTURE.md` before every sprint.

## Product
**UniPost AI — India's Creator Operating System.** One workspace where creators
**Plan → Create → Schedule → Publish → Analyze → Grow → Monetize** across every
platform (Instagram, YouTube, LinkedIn, X, TikTok, Facebook, Threads).

**Positioning:** not another scheduler (Buffer/Hootsuite). The differentiators are
the **AI Growth Coach** (reads your analytics, tells you what to post next) and
**Creator Score / XP / Streaks** (gamified consistency). AI-native, India-first.

## Audience
India's creators and small creator-teams/agencies — mobile-first, price-sensitive
(INR pricing), multi-platform.

## Business model
Freemium SaaS. Tiers: **Free (₹0)**, **Creator Pro (₹799/mo)**, **Agency (₹2,499/mo)**.
AI usage metered via "AI credits". Payments via **Razorpay** (INR). See `config/pricing.ts`.

## Stack (target)
- **Frontend:** Next.js 14 App Router · TypeScript (strict) · Tailwind · GSAP · Framer Motion · Three.js. Custom design-system primitives (no Shadcn installed).
- **Backend:** Supabase (Postgres + Auth + Storage) · Server Actions · Route Handlers.
- **AI:** Google Gemini (`@google/generative-ai`).
- **Payments:** Razorpay.
- **Validation:** Zod.

## Engineering principles
**Reuse → Extend → Create.** Never duplicate logic. Never rewrite working systems.
Prefer composition and server components; client components only when needed.
Production-ready, strict TS, secure by default, accessible, responsive.

## Hard rules
- **The landing page is FINAL.** Do not redesign it, replace its animations, or
  change its UI except where strictly required for integration.
- **All authenticated pages inherit the Bharvix/UniPost design language** (tokens,
  glass, Syne/Jakarta/mono type, aurora accents, cursor, motion).
- Every sprint ends with a report and a **STOP**. Never auto-continue.

## Domains / environments
Product subdomain: `unipost.bharvix.com`. Parent: `bharvix.com`. Repo:
`github.com/Abysrix/Unipost`. Local dev runs on Next dev server.
