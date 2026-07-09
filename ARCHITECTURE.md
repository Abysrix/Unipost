# ARCHITECTURE.md
### How UniPost AI is built — folder structure, patterns, conventions, security.

_Updated Sprint 10 (Production Hardening). Sprints 1–2's route/auth architecture below is unchanged in shape — it just has a lot more built on top of it now._

## Route architecture (App Router + route groups)
```
app/
  layout.tsx            # root: fonts, metadata, <AppProviders>
  page.tsx              # landing page (FINAL)
  error.tsx              # root error boundary (landing + (auth))
  global-error.tsx        # last-resort boundary if the root layout itself throws
  not-found.tsx           # global 404
  robots.ts / sitemap.ts / icon.svg   # SEO/metadata file conventions
  globals.css
  (auth)/               # unauthenticated flows — no app chrome
    layout.tsx          # centered auth shell (aurora bg)
    login/ signup/ forgot-password/ reset-password/
  (app)/                # authenticated product — protected, noindex
    layout.tsx          # server: requires session, maintenance-mode gate, renders app shell
    error.tsx            # app-group error boundary
    dashboard/ create/ posts/ calendar/ ai/ analytics/ score/ coach/
    integrations/ settings/ billing/
    admin/              # the operator console — its own layout.tsx role-gate
      users/ billing/ ai/ health/ moderation/ audit/ settings/
  auth/
    callback/route.ts   # OAuth PKCE code exchange (also handles password-recovery redirects)
    confirm/route.ts    # email OTP / magic-link verification
    oauth/[provider]/{start,callback}/route.ts   # per-platform social-integration OAuth
  api/
    ai/chat/route.ts             # streaming Gemini chat
    webhooks/razorpay/route.ts   # payment webhook (no user session — signature-verified)
middleware.ts           # session refresh + route protection
```
Route groups `(auth)` and `(app)` keep unauth vs. authenticated shells separate
without affecting the URL. Landing stays at `/`. Every page under `(app)/*`
(including `/admin/*`) is protected **and noindex'd** — see Security model below.

## Supabase integration (`@supabase/ssr`)
- `lib/supabase/client.ts` — browser client (`createBrowserClient`).
- `lib/supabase/server.ts` — server client bound to `next/headers` cookies. Use in
  Server Components, Server Actions, Route Handlers. RLS-enforced — a user can only
  ever see/touch their own rows through this client. **Never** trust the client for auth.
- `lib/supabase/admin.ts` — service-role client (Sprint 8+). **RLS-bypassing** — only
  ever imported by server-only code: `lib/db/admin/*` (the whole admin console) and the
  handful of `lib/db/billing.ts` writes that need to happen regardless of which table
  policy is active (see Security model). Never imported by a `"use client"` file.
- `lib/supabase/middleware.ts` — `updateSession(req)` refreshes the auth cookie on
  every request; called from root `middleware.ts`.
- **Security rule:** always verify the user with `supabase.auth.getUser()` (revalidates
  the JWT with Supabase) — never rely on `getSession()` for authorization decisions.

## Auth flow
1. Email/password + Google OAuth via **Server Actions** (`app/(auth)/actions.ts`).
2. OAuth redirects to `/auth/callback` → `exchangeCodeForSession` → `/dashboard`.
3. Email signups confirm via `/auth/confirm` (`verifyOtp`).
4. Forgot/reset password: `/forgot-password` → `resetPasswordForEmail` → emailed link →
   `/auth/callback?next=/reset-password` → `/reset-password` → `updateUser({password})`.
5. `middleware.ts`: an **allow-list of public paths** (`/`, `/login`, `/signup`,
   `/forgot-password`, `/reset-password`, anything under `/auth/`) is exempt; every other
   page route is protected by default — so a new page under `(app)/*` is protected
   automatically, with nothing to remember to register. Authenticated users hitting
   `/login`|`/signup` bounce to `/dashboard`. `/api/*` is out of scope for middleware —
   those routes self-authenticate (a session check inside the handler, or a signature
   check for the Razorpay webhook).
6. Protected `(app)/layout.tsx` re-checks `getUser()` server-side (defense in depth),
   resolves the role/plan view-model once, and gates on `maintenance_mode` (admins exempt).

## Layers & conventions
- **Server Components by default;** `"use client"` only for interactivity.
- **Server Actions** for all mutations, one `actions.ts` per route. Validate inputs with
  **Zod** (`lib/validations/*`) — every Server Action is network-callable directly with
  arbitrary JSON, so a TypeScript param type alone enforces nothing at runtime; the Zod
  parse is the real gate. Return typed `{ error }` results.
- **Data layer** (`lib/db/*`) — one module per domain (`posts`, `schedule`, `ai`, `growth`,
  `integrations`, `billing`, `xp`, `plan`), each wrapping Supabase calls behind typed
  functions. `lib/db/admin/*` is the equivalent layer for the admin console — always via
  the service-role client, always with its own app-level `guardAdmin()`/actor check, since
  RLS doesn't apply there. Small "leaf" modules (`lib/db/plan.ts`, `lib/db/xp.ts`) exist
  specifically to avoid import cycles between larger modules — intentional, not a smell.
- **Services**: `lib/ai/*` (Gemini, REST/SSE, no SDK), `lib/billing/*` (Razorpay + the
  plan-limits engine), `lib/integrations/*` (per-platform OAuth + token crypto),
  `lib/schedule/*` (calendar/queue/publishing), `lib/growth/*` (analytics/score/coach) —
  never called from the client directly.
- **Design inheritance:** authed screens use the same tokens, `Button`, `GlassCard`,
  `Container`, type scale and aurora accents as the landing.
- **Naming:** components `PascalCase.tsx`, hooks `useX.ts`, utils/services `camelCase.ts`.

## Environment variables
See [`README.md`](./README.md#environment-variables) for the full table with which are
required vs. optional-with-a-working-stub. Public (browser): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. Server-only:
`SUPABASE_SERVICE_ROLE_KEY` (never exposed), `GEMINI_API_KEY`, `INTEGRATIONS_SECRET_KEY`,
`RAZORPAY_KEY_SECRET`. Defined in `.env.example` — that file should only ever contain
placeholder-looking values, never anything that resembles a real key.

## Security model
- Cookie-based sessions (httpOnly, managed by `@supabase/ssr`).
- Row Level Security (RLS) on every table. Two patterns coexist by design:
  - **Own-row tables** (posts, schedules, AI history, connected accounts, etc.) — a plain
    `auth.uid() = user_id` policy per CRUD verb, read AND written through the
    request-scoped client.
  - **System-computed tables** (`subscriptions`, `payments`, `invoices`,
    `ai_credit_history`, `usage_metrics`, `billing_events`, and everything in the admin
    console) — **read-only** for the owning user; every write goes through the
    service-role admin client with an app-level authorization check instead (mirroring
    `spend_credits()`, the one exception that's a `security definer` RPC re-checking
    `auth.uid()` internally, since it needs to run under the caller's own JWT). This
    exists because a blanket "own-row write" policy on a system-computed table lets a
    user set its values to whatever they want directly, bypassing whatever application
    logic (a payment signature check, a balance check) was supposed to gate that write —
    migration `0009_security_hardening.sql` closed this on the billing tables; the admin
    tables (`0008_admin.sql`) had it right from the start.
  - Newer migrations (`0008`+) additionally wrap policy predicates in `(select ...)`
    (evaluated once per query, not per row) and use `to authenticated` explicitly.
    Migrations `0001`–`0007` don't — not a vulnerability (unauthenticated `auth.uid()` is
    `NULL`, never matches `= user_id`), just a performance-pattern inconsistency, flagged
    in `PROJECT_STATUS.md` as a deliberate, not-yet-done follow-up.
- All protected **pages** are guarded at two layers: middleware (allow-list, see Auth
  flow) + server-component check. Protected **mutations** additionally re-check
  authorization inside the Server Action itself (e.g. every admin action starts with
  `guardAdmin()`) — never rely on the page-level gate alone for a mutation.
- Zod validation on every Server Action / Route Handler input that reaches a paid Gemini
  call or a database write.
- **Security headers** (`next.config.mjs`): CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Permissions-Policy`.
  The CSP allow-lists Supabase and Razorpay's known origins by name; `'unsafe-eval'` stays
  in `script-src` for Three.js/webpack HMR compatibility — a known, deliberate relaxation,
  not an oversight.
- Open-redirect guard: `lib/utils.ts::isSafeRedirect()` — any user-suppliable redirect
  target must go through this (rejects `//host`-style protocol-relative URLs, not just
  scheme-based ones).
- **No rate-limiting yet** on auth or AI endpoints — a known, tracked gap (see
  `PROJECT_STATUS.md`), not silently missing.

## Build/runtime notes
- `.next` junctioned to `%TEMP%\unipost-next` (OneDrive workaround).
- `transpilePackages: ["three"]`; `optimizePackageImports` for lucide/framer.
- `gsap`/`ScrollTrigger` are dynamically imported (`AppProviders.tsx`, mirroring the
  pre-existing pattern in `hooks/useLenis.ts`) specifically so they don't end up in the
  shared bundle every route pays for — only the landing page's own section components
  need them eagerly, and Next's route-based code-splitting handles that on its own once
  nothing in the shared root also imports them statically.
- `app/icon.tsx`/`app/opengraph-image.tsx` (Next's `next/og` file conventions) failed to
  prerender locally with `TypeError: Invalid URL` inside `@vercel/og`'s bundled font
  loader — same family of issue as the `.next`/OneDrive workaround above. Worked around
  with a static `app/icon.svg` instead; untested whether the dynamic version would work
  on Vercel's Linux build servers.
