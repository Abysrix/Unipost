# UniPost AI

India's Creator Operating System — plan, create, schedule, publish, analyze and grow across every platform from one AI-native workspace. A Bharvix product.

> For product context (what/why) and current build status, see [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) and [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). For folder structure and conventions, see [`ARCHITECTURE.md`](./ARCHITECTURE.md). For per-platform OAuth app registration (Meta, LinkedIn, X, YouTube, OpenRouter, Razorpay) and an admin console walkthrough, see [`docs/SETUP_GUIDES.md`](./docs/SETUP_GUIDES.md). This file is the practical "how do I run this" guide.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Google Gemini · Razorpay · Zod.

## Prerequisites

- Node.js 18.18+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine)

Everything else (Gemini, Razorpay, per-platform OAuth apps) is **optional in development** — every one of those integrations has a built-in simulated/stub mode so the full product works end-to-end without real third-party credentials. See [Optional integrations](#optional-integrations) below.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` (gitignored — never commit real values) and fill in:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same page — the public `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same page — **server-only**, never expose to the browser |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` in dev; your real domain in production |
| `API_KEY` | No | An [OpenRouter](https://openrouter.ai/keys) API key (OpenAI-compatible endpoint — despite the name, `lib/ai/gemini.ts` talks to OpenRouter, not Gemini directly). Without it, AI Studio loads but returns a friendly error. |
| `INTEGRATIONS_SECRET_KEY` | Yes, for `/integrations` | Any 32+ char random string (`openssl rand -base64 32`). Encrypts stored OAuth tokens. |
| `CRON_SECRET` | Yes, for background jobs | Any random string. Required by `Authorization: Bearer` on every `/api/cron/*` route — see [Background jobs](#background-jobs-vercel-cron) below. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Without them, checkout runs through an in-app mock payment modal. |
| `RAZORPAY_WEBHOOK_SECRET` | No | Only needed once you register a real webhook URL. |
| `RESEND_API_KEY` / `NOTIFICATIONS_FROM_EMAIL` | No | Without a key, email notifications fall back to a server-log stub — in-app notifications still work fully. |
| `META_WEBHOOK_VERIFY_TOKEN` / `META_APP_SECRET` | No | Only needed to receive real Meta (Instagram/Facebook) webhook events at `/api/webhooks/meta`. |
| `X_WEBHOOK_CONSUMER_SECRET` | No | Only needed to receive real X webhook events at `/api/webhooks/x`. |
| `*_CLIENT_ID` / `*_CLIENT_SECRET` per platform | No | Without them, "Connect" uses a simulated OAuth consent screen. YouTube also accepts `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` as a fallback. |

See [`.env.example`](./.env.example) for the complete, current list — it's the source of truth; this table calls out the ones worth knowing about up front.

## Database setup (Supabase)

1. Create a Supabase project.
2. Run every file in [`supabase/migrations/`](./supabase/migrations/) **in order** (`0001` → the highest-numbered file in that folder), via the SQL Editor or the Supabase CLI. Each migration is idempotent (`create table if not exists`, `drop policy if exists` before `create policy`), so re-running is safe.
3. **Authentication → URL Configuration:** set Site URL to your `NEXT_PUBLIC_SITE_URL`, and add `${NEXT_PUBLIC_SITE_URL}/auth/callback` and `/auth/confirm` to the redirect allow-list.
4. **Authentication → Providers → Google:** enable it and paste a Google OAuth client ID/secret if you want "Continue with Google" to work.
5. To reach `/admin`, set your user's `app_metadata.role` to `"admin"` (Authentication → Users → edit `raw_app_meta_data` in the Supabase dashboard).

Every migration's purpose is documented at the top of its own file — read `supabase/migrations/0001_*.sql` onward for the full schema history, or `PROJECT_STATUS.md`'s Sprint log for the narrative version.

## Project structure

```
app/
  page.tsx              # landing page (FINAL — do not redesign)
  (auth)/                # login, signup, forgot/reset password — no app chrome
  (app)/                 # the authenticated product, one route group per module
    dashboard/ create/ posts/ calendar/ ai/ analytics/ score/ coach/
    integrations/ billing/ settings/ notifications/ admin/
  auth/                  # OAuth + email-confirmation route handlers
  api/
    ai/chat/route.ts             # streaming AI chat (OpenRouter)
    cron/{publish,analytics,jobs}/route.ts   # Vercel Cron entry points — see Background jobs below
    webhooks/{razorpay,meta,x}/route.ts      # inbound provider webhooks — signature-verified, no user session
  robots.ts sitemap.ts icon.svg   # SEO/metadata file conventions
middleware.ts            # session refresh + route protection (edge)
lib/
  supabase/              # client.ts (browser) · server.ts (request-scoped) · admin.ts (service-role)
  db/                    # one data-layer module per domain; db/admin/* for the admin console
  ai/                    # context service, memory, prompt builder, growth coach
  jobs/                  # job queue + background workers (growth report, notifications, cleanup)
  notifications/         # in-app + email notification delivery
  webhooks/              # webhook signature verification + idempotent event logging
  security/              # Postgres-backed rate limiting
  billing/ growth/ integrations/ schedule/ validations/ monitoring/
components/              # one folder per feature area, plus ui/ and dashboard/ for shared primitives
supabase/migrations/     # numbered, ordered, idempotent SQL migrations
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full route map, data-layer conventions, and the security model in detail.

## Optional integrations

Every third-party dependency in this app is **config-gated with a working stub**, so you can run and demo the entire product on Supabase alone:

- **No `GEMINI_API_KEY`** → AI Studio/chat/Smart Editor load normally and return a friendly "not configured" message instead of a generation.
- **No `RAZORPAY_KEY_ID`/`SECRET`** → checkout opens an in-app mock payment modal that exercises the exact same server-side verify/activate path a real payment would.
- **No per-platform OAuth credentials** → "Connect" on `/integrations` runs a simulated consent screen, round-tripping through the same callback route a real provider would use.

Add real credentials at any point and the same code switches to the real integration — nothing else changes.

## Scripts

```bash
npm run dev         # start the dev server
npm run build       # production build
npm run start       # run a production build locally
npm run lint        # ESLint (also runs automatically as part of `build`)
npm run typecheck   # tsc --noEmit
```

## Background jobs (Vercel Cron)

Publishing scheduled posts, syncing analytics, and processing the async job queue
(growth reports, email delivery, retention cleanup) all run on a schedule, not on
request — nothing publishes or syncs automatically until these are wired up.

1. In `vercel.json` (or the Vercel dashboard's Cron Jobs UI), point a schedule at each of:
   - `/api/cron/publish` — publishes due scheduled posts. Every 1–5 minutes.
   - `/api/cron/analytics` — syncs analytics from connected accounts. Hourly is reasonable.
   - `/api/cron/jobs` — drains the generic job queue (growth reports, notification emails, cleanup). Every 5–15 minutes.
2. Each route requires `Authorization: Bearer ${CRON_SECRET}` — Vercel Cron sends this automatically once `CRON_SECRET` is set as an environment variable; if you're triggering these from another scheduler, add the header yourself.
3. Without this step the app still works interactively (manual "Publish now," manual "Sync now" both bypass cron), but nothing happens in the background — scheduled posts will sit at `status: scheduled` past their time, and analytics will only ever reflect a manual sync.

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add every required environment variable from the table above to the Vercel project (Production + Preview as needed).
3. Set `NEXT_PUBLIC_SITE_URL` to your real production URL, and add its `/auth/callback` + `/auth/confirm` paths to Supabase's redirect allow-list.
4. Set up the three Cron Jobs described above.
5. Deploy. `next build` runs type-checking and linting as part of the build — a failing build means a real type or lint error, not a config gap.

## Known local-environment quirks

- **OneDrive-synced Windows checkouts:** `.next` is junctioned outside the synced folder (`%TEMP%\unipost-build\next`, with a sibling `%TEMP%\unipost-build\node_modules` junction pointing back at the real `node_modules`). The failure this works around isn't OneDrive file-locking — it's that Next's auto-generated `pages/`-compat shims (`_document.js`, etc.) are `require()`'d as raw CommonJS at runtime and resolve bare specifiers by walking up the directory tree from `.next`'s own location on disk; junctioning `.next` alone breaks that walk-up before it ever reaches the real project's `node_modules`. The sibling `node_modules` junction puts it back in the resolution chain. If you hit `Cannot find module 'react/jsx-runtime'` from `_document.js`, this is almost certainly why — a bare `.next` junction/symlink outside the project root is not sufficient by itself.
- **`next/og` (`ImageResponse`) can fail to prerender** on some local Windows setups with a Windows/OneDrive-style path (`Invalid URL` deep inside `@vercel/og`) — this is why the favicon is a static `app/icon.svg` rather than a generated one. Untested whether this reproduces on Vercel's Linux build servers; if you need a generated Open Graph image, try `app/opengraph-image.tsx` there first.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/admin` redirects you to `/dashboard` | Your user's `app_metadata.role` isn't `"admin"` — see step 5 above. |
| AI Studio returns "not configured" | `API_KEY` isn't set — this is expected, not a bug, until you add one. (Note: it's `API_KEY`, not `GEMINI_API_KEY` — the AI service is OpenRouter-backed.) |
| `/integrations` "Connect" fails immediately | `INTEGRATIONS_SECRET_KEY` is missing — this one is required, unlike other optional keys. |
| Scheduled posts never publish / analytics never update on their own | The Vercel Cron jobs aren't set up, or `CRON_SECRET` doesn't match — see [Background jobs](#background-jobs-vercel-cron) above. |
| A page 500s with no real Supabase migration applied | Run the migrations in `supabase/migrations/` in order — most pages degrade gracefully (empty state) without them, but almost every `/admin/*` page queries tables migration `0008` creates, so it'll error (not just look empty) without it. Reaching `/admin` itself only needs your `app_metadata.role`, not a migration. |
| A Server Action returns "Too many requests" / rate-limited unexpectedly | `rate_limits` (migration `0018`/`0019`) is Postgres-backed and IP-bucketed (`lib/security/rateLimit.ts`) — shared IPs (corporate NAT, some mobile carriers) can trip a limit meant for one abusive client. Limits are per-action (`login`, `signup`, `ai_chat`, etc.), not global. |
| TypeScript error about `Set` spread or similar syntax | Shouldn't happen — `tsconfig.json`'s `target` is `es2017`. If you see this, check you're not on a stale `tsconfig.tsbuildinfo` (delete it and re-run `typecheck`). |
