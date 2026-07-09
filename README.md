# UniPost AI

India's Creator Operating System — plan, create, schedule, publish, analyze and grow across every platform from one AI-native workspace. A Bharvix product.

> For product context (what/why) and current build status, see [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) and [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). For folder structure and conventions, see [`ARCHITECTURE.md`](./ARCHITECTURE.md). This file is the practical "how do I run this" guide.

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
| `GEMINI_API_KEY` | No | [Google AI Studio](https://aistudio.google.com/app/apikey). Without it, AI Studio loads but returns a friendly error. |
| `INTEGRATIONS_SECRET_KEY` | Yes, for `/integrations` | Any 32+ char random string (`openssl rand -base64 32`). Encrypts stored OAuth tokens. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Without them, checkout runs through an in-app mock payment modal. |
| `RAZORPAY_WEBHOOK_SECRET` | No | Only needed once you register a real webhook URL. |
| `*_CLIENT_ID` / `*_CLIENT_SECRET` per platform | No | Without them, "Connect" uses a simulated OAuth consent screen. |

## Database setup (Supabase)

1. Create a Supabase project.
2. Run every file in [`supabase/migrations/`](./supabase/migrations/) **in order** (`0001` → `0009`), via the SQL Editor or the Supabase CLI. Each migration is idempotent (`create table if not exists`, `drop policy if exists` before `create policy`), so re-running is safe.
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
    integrations/ billing/ settings/ admin/
  auth/                  # OAuth + email-confirmation route handlers
  api/                   # webhook + streaming endpoints
  robots.ts sitemap.ts icon.svg   # SEO/metadata file conventions
middleware.ts            # session refresh + route protection (edge)
lib/
  supabase/              # client.ts (browser) · server.ts (request-scoped) · admin.ts (service-role)
  db/                    # one data-layer module per domain; db/admin/* for the admin console
  ai/ billing/ growth/ integrations/ schedule/ validations/ monitoring/
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

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add every required environment variable from the table above to the Vercel project (Production + Preview as needed).
3. Set `NEXT_PUBLIC_SITE_URL` to your real production URL, and add its `/auth/callback` + `/auth/confirm` paths to Supabase's redirect allow-list.
4. Deploy. `next build` runs type-checking and linting as part of the build — a failing build means a real type or lint error, not a config gap.

No manual post-deploy steps are required beyond the Supabase setup above.

## Known local-environment quirks

- **OneDrive-synced Windows checkouts:** `.next` is junctioned to `%TEMP%\unipost-next` — OneDrive's file-locking corrupts an in-place `.next` during dev. If you see a similar issue, junction/symlink `.next` outside the synced folder.
- **`next/og` (`ImageResponse`) can fail to prerender** on some local Windows setups with a Windows/OneDrive-style path (`Invalid URL` deep inside `@vercel/og`) — this is why the favicon is a static `app/icon.svg` rather than a generated one. Untested whether this reproduces on Vercel's Linux build servers; if you need a generated Open Graph image, try `app/opengraph-image.tsx` there first.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/admin` redirects you to `/dashboard` | Your user's `app_metadata.role` isn't `"admin"` — see step 5 above. |
| AI Studio returns "not configured" | `GEMINI_API_KEY` isn't set — this is expected, not a bug, until you add one. |
| `/integrations` "Connect" fails immediately | `INTEGRATIONS_SECRET_KEY` is missing — this one is required, unlike other optional keys. |
| A page 500s with no real Supabase migration applied | Run the migrations in `supabase/migrations/` in order — most pages degrade gracefully (empty state) without them, but almost every `/admin/*` page queries tables migration `0008` creates, so it'll error (not just look empty) without it. Reaching `/admin` itself only needs your `app_metadata.role`, not a migration. |
| TypeScript error about `Set` spread or similar syntax | Shouldn't happen — `tsconfig.json`'s `target` is `es2017`. If you see this, check you're not on a stale `tsconfig.tsbuildinfo` (delete it and re-run `typecheck`). |
