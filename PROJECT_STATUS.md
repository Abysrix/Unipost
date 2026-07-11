# PROJECT_STATUS.md
### Living status log — the accurate "current state". Update at the end of every sprint.

## 🚀 RELEASE CANDIDATE 1 (RC1) → Integration Phase
_Last updated: Integration Sprint 2 (Social OAuth & Account Connection Platform) — complete; `tsc` clean, `next build` compiles/lints/typechecks clean (see this sprint's log entry for a local build-verification caveat). Requires Supabase migrations (0001–0011) + Supabase keys + `INTEGRATIONS_SECRET_KEY` to run live. See this sprint's log entry below for the OAuth-hardening pass._

## Legend
✅ done · 🟡 partial · 🔴 not started · ⛔ blocked

## Reconciliation note (important)
The engineering brief listed **Authentication as "Completed."** A repo audit on
Sprint 1 kickoff found **no auth existed** — `app/` contained only the landing
page; no Supabase deps, middleware, routes, or session logic. Corrected below.
Auth is being built **from scratch in Sprint 1.**

## Module status
| Area | Status | Notes |
|---|---|---|
| Landing page | ✅ | Hero (living dashboard + aurora WebGL + GSAP), 8 story sections, Loader, Navbar, Footer. **FINAL — do not redesign.** |
| Design system | ✅ | `lib/` tokens·motion·gsap·utils·seo, `config/`, 18 hooks, `providers/AppProviders`, ~30 UI/motion/three components. |
| **Authentication & Identity** | ✅* | **Sprint 1 done; identity system rebuilt in Integration Sprint 1.** Supabase Auth (email/password + Google OAuth), `/login` + `/signup`, middleware route-protection, OAuth + email-confirm route handlers, session utilities, protected `/dashboard` shell. Role/plan/display-name/avatar/creator-score/XP now live in a real `profiles` table (migration `0010`), not `app_metadata` + an email allow-list — see this sprint's log entry. *Build passes; end-to-end verification needs live Supabase keys (below). |
| Database schema | ✅ | **`posts` + `post-media` (Sprint 3); AI tables (Sprint 4); scheduling tables (Sprint 5); growth/analytics tables (Sprint 6); integration tables (Sprint 7); billing tables (Sprint 8); admin tables (Sprint 9); `profiles` (Integration Sprint 1, `0010_profiles.sql`).** No more standing "profiles pending" gap. |
| **App shell / dashboard** | ✅ | **Sprint 2 done.** Collapsible sidebar + mobile drawer, sticky topbar (search/notifications/plan/user menu), role system (creator/admin), dashboard home (9 widgets), reusable dashboard component library, empty/loading/error/404 states, 11 navigable routes. Mock data only — no business logic. |
| **Creator Studio** | ✅ | **Sprint 3 done.** Post editor (title/content/auto-grow/counters/emoji/hashtag), multi-platform selector, media manager (Supabase Storage), platform preview, per-platform validation, autosave + Ctrl+S + unsaved-changes guard, full draft CRUD (create/edit/duplicate/soft-delete/restore) persisted via RLS. Drafts library at `/posts`. **Sprint 4:** highlight-to-Ask-AI selection menu in the editor. |
| **AI Studio & Content Engine** | ✅ | **Sprint 4 done.** Gemini service (`lib/ai/*`, REST/SSE, retry, no SDK); streaming chat (`/api/ai/chat`) with persisted conversations + history, rename/pin/delete/search; 10 templates; prompt library (save/favorite/search); generation history (reuse/favorite/delete/search); 13-action prompt engine powering the in-editor Smart Editor. `/ai` shipped. |
| **Scheduling / Publishing** | ✅ | **Sprint 5 done.** Interactive calendar (month/week/day/agenda, drag-drop, resize, today highlight); scheduler (schedule/reschedule/cancel/publish-now/duplicate/delete, timezone-aware, best-time suggestions); per-platform drag-to-reorder queues with failed/retry lane + soft limits; full lifecycle (draft→scheduled→queued→publishing→published→failed→canceled→archived) via reusable `PublishingStatus`; reminders (upcoming/missed/failed/published/draft) derived from schedule state. Publishing itself is a **stub** (`lib/schedule/publishing.ts`) — real platform APIs plug into the `PlatformPublisher` registry later. `/calendar` shipped; Schedule button live in Creator Studio. |
| **Analytics (Creator Intelligence)** | ✅ | **Sprint 6 done.** Full analytics dashboard — KPIs, growth/engagement/reach trend charts, platform comparison, publishing timeline, activity heatmap, top-performing + recent posts. Follower/reach/engagement numbers are a **deterministic simulation** (`lib/growth/simulate.ts`) seeded per user and correlated to real publish activity — same stopgap pattern as Sprint 5's publishing stub — until a live platform API lands. |
| **Creator Score / XP / Achievements / Goals** | ✅ | **Sprint 6 done.** 7-factor Creator Score (5 of 7 factors computed from 100% real data: consistency, frequency, platform activity, AI utilization, content quality; engagement + growth use the simulated analytics above) with daily history; XP ledger + levels awarded on real actions (publish, schedule-ahead, AI use, goals, achievements); 10-achievement catalog; user-created Goals (followers/reach/posts/engagement/revenue) with auto-tracked progress. |
| **AI Growth Coach** | ✅ | **Sprint 6 done.** Rule-based recommendation engine (8 rules: streak risk, timing, format, platform diversity, engagement drop, AI usage, growth win, goal progress) persisted per-kind with dismiss/complete/history. "Ask the coach" deep-links into the **existing** `/ai` conversation system (Sprint 4) rather than a second chat stack. |
| **Social Integration Platform** | ✅ | **Sprint 7 done; hardened in Integration Sprint 2.** Config-driven OAuth engine for 6 real platforms (Instagram, Facebook, LinkedIn, X, Threads, YouTube) with AES-256-GCM-encrypted token storage, HMAC-signed CSRF state, automatic + silent refresh, capability system, and a full publishing-adapter interface (publish/schedule/update/delete/validate/preview — Sprint 7, untouched this sprint). No real developer-app credentials exist yet, so the connect flow runs through a **simulated consent screen** end-to-end (same stub philosophy as Sprint 5/6) — adding real client id/secret per platform activates real OAuth with zero code changes. Integration Sprint 2 closed a Sprint-9-shaped RLS gap on the 5 integration tables and added multi-account primary/nickname support; the real S256 PKCE flow for X was found already correctly wired going into this sprint (verified, not re-built). `/integrations` shipped. |
| **Billing, Subscriptions & AI Credits** | ✅ | **Sprint 8 done.** Real `subscriptions` (source of truth) synced to the cheap `app_metadata.plan` cache used app-wide; configuration-driven plan-limits engine (`lib/billing/plans.ts` — never a hardcoded number at a call site); real Razorpay order/verify/webhook integration, **config-gated to an in-app mock checkout** when no `RAZORPAY_KEY_ID`/`SECRET` exist (same stub philosophy as Sprint 5/7); atomic race-safe AI credit ledger (`spend_credits` Postgres function, advisory-locked, ownership-checked) wired as a real hard gate into `runAction`, `/api/ai/chat`, `createSchedules` (plan-capped scheduled posts) and `completeConnection` (plan-capped connected accounts); Analytics history depth now plan-gated. `/billing` shipped; `SubscriptionStatus` dashboard widget now reads real credit data. |
| **Admin Control Center** | ✅ | **Sprint 9 done; role check now backed by `profiles` (Integration Sprint 1).** Full platform-operations console at `/admin/*` (Overview, Users, Billing, AI Usage, Platform Health, Moderation, Audit Log, Settings), backed entirely by the service-role admin client. User management (search/filter/suspend/reactivate/delete/role-change/plan-override/password-reset/CSV export) over the Auth Admin API, now batch-joined against `profiles` for role/display-name/creator-score/xp instead of `app_metadata`. Billing admin (plans/payments/invoices/revenue charts, manual upgrade/downgrade/cancel/renew; refunds are bookkeeping-only, no live Razorpay call). AI monitoring (requests/duration/failure-rate/rough cost estimate) — added `ai_generations.duration_ms` + failure-path audit logging to make this real, not mocked. Platform Health (opt-in manual check, config-presence based, persisted). Content Moderation (flag/unflag/soft-delete/bulk, over new `posts.flagged`/`posts.moderation_note`). Audit Log — new `audit_logs` table + a unified timeline composed from it plus the existing `billing_events`/`integration_events`/`sync_logs`. Feature Flags (`maintenance_mode`, `ai_studio_enabled`, `growth_coach_enabled`, `signups_enabled`) enforced at runtime (`(app)/layout.tsx` gate + read call-sites), plus a read-only Plans/pricing view and a safe env-config **presence** view (never values). Also shipped the previously-missing **password reset flow** (`/forgot-password`, `/reset-password`) as part of the same audit-logging work. |
| **Identity, RBAC & Real Profiles** | ✅ | **Integration Sprint 1 done.** Real `profiles` table (migration `0010`) replaces `app_metadata` + an `ADMIN_EMAILS` env allow-list as the source of truth for role/plan/display name/avatar/bio/timezone/username/creator score/XP. Column-lockdown trigger stops a user's own session from ever writing the privileged columns (role/plan/score/xp) — a blanket own-row write policy would let a user grant themselves admin by writing their own `role` column directly, the same mistake Sprint 8's original billing migration made. Role now checked at the edge (middleware, scoped to `/admin/*` only), the admin layout, and every admin Server Action — three layers, not one. Dashboard's Creator Score widget and every identity display (name/avatar/plan) read real data; a real `/settings` profile-edit page replaces its `ComingSoonCard`. See this sprint's log entry for the full design rationale. |
| **OAuth Hardening & Multi-Account Support** | ✅ | **Integration Sprint 2 done.** Closed the same "blanket own-row write policy" RLS gap Sprint 9's `0009_security_hardening.sql` found on billing — migration `0011` locks `connected_accounts`/`oauth_tokens`/`platform_permissions`/`sync_logs`/`integration_events` to read-only for `authenticated`; `lib/db/integrations.ts` moved to the service-role client, same pattern as `lib/db/billing.ts` (two write paths — `deleteConnection`/`renameConnection` — needed an explicit `user_id` filter added during the conversion, since the service-role client no longer gets that from RLS for free). Real S256 PKCE for X/Twitter was found **already correctly implemented** going into this sprint — verified via direct code inspection rather than assumed from memory, then cleaned up one vestigial artifact: the static provider config still carried a fake `code_challenge: "challenge"` placeholder that `buildAuthorizeUrl` was already silently overriding whenever a real verifier was supplied; removed it and added a declarative `pkce: true` config field so `requiresPkce()` reads config instead of hardcoding a platform check. Real provider-side revoke for Instagram/Facebook/Threads (Meta Graph API `DELETE .../me/permissions`) alongside the pre-existing Google one, via a new `revokeMethod: "meta" | "google"` discriminator — 2 of 6 platforms previously had no working revoke at all; LinkedIn/X's revoke shapes need client credentials in the request body (a third, different shape) and are left as a documented no-op rather than guessed at. Multi-account primary/nickname (`is_default`, `nickname` columns; at most one default per user+platform via a partial unique index). Avatar images (`profile_image`) were stored since Sprint 7 but never rendered anywhere — now shown in both the platform grid and connection detail. TikTok/Pinterest gained real-endpoint provider-config stubs (`FUTURE_PROVIDER_CONFIGS`) without widening `PlatformId` (exhaustively matched across scheduling/composer/analytics — out of this sprint's "only establish connections" scope). See this sprint's log entry for the full design rationale. |

## Environment
- `.next` is junctioned to `%TEMP%\unipost-next` (OneDrive corrupts in-place `.next`).
- `node_modules` installed locally.
- **Secrets:** `.env.local` (gitignored). User provides Supabase keys. See `.env.example`.

## Sprint log
- **Integration Sprint 2 — Social OAuth & Account Connection Platform ✅:**
  Audited Sprint 7's existing integration system in full before writing
  anything (per this sprint's own "reuse everything possible" instruction),
  and — importantly — verified every claim by reading the actual current
  code rather than trusting memory of what a "typical Sprint 7 baseline"
  should contain (a lesson from earlier this Integration Phase: this
  project's disk state had been reverted by an external tool mid-session, to
  a checkpoint that turned out to be *not* a clean single-point-in-time
  snapshot — real S256 PKCE for X was already correctly wired, something
  that would only be true if the checkpoint captured some later work too).
  Confirmed present: a config-driven `OAuthProviderConfig` registry
  (`lib/integrations/providers.ts`) + a generic OAuth 2.0 engine
  (`lib/integrations/oauth.ts`) that never branches per platform, normalized
  `ProviderProfile`/`ProviderTokens` interfaces every platform returns,
  AES-256-GCM token encryption + HMAC-signed CSRF state
  (`lib/integrations/crypto.ts`), and an already-working stub/real dual-mode
  (`hasRealCredentials()`) that makes "add credentials, zero code changes"
  literally true. This sprint's brief asked for a `SocialProvider` interface
  with connect/disconnect/refreshToken/validateToken/getProfile — the
  existing architecture already satisfies all of that
  (`buildAuthorizeUrl`+`exchangeCode` / `disconnectAccount` /
  `refreshAccessToken` / `validateConnection` / `fetchProfile`) via
  composition rather than a class per platform; rewriting it into literal
  `InstagramProvider`/`FacebookProvider`/etc. classes would have
  **duplicated** the generic engine six times over — exactly what "never
  duplicate logic" rules out. Real new work instead:
  **Security (the critical finding, same shape as Sprint 9's on billing):**
  migration `0006` gave `connected_accounts`/`oauth_tokens`/
  `platform_permissions`/`sync_logs`/`integration_events` the identical
  blanket own-row INSERT/UPDATE/DELETE policy that made the billing tables
  exploitable. `oauth_tokens` is what actually matters: a user could
  insert/update their own row directly (though not forge a *working* token —
  the encryption key never reaches the client), and could fabricate
  `connected_accounts` rows to route around `completeConnection`'s
  plan-based connection-limit check, which is application logic, not
  something the old RLS enforced on its own. Fixed with the exact Sprint 9
  pattern: moved every write in `lib/db/integrations.ts`
  (`completeConnection`, `disconnectAccount`, `syncAccount`, `saveTokens`,
  `savePermissions`, the new `setDefaultAccount`/`renameConnection`) to the
  service-role client — still gated by `uid()`/explicit `user_id` filters in
  application code — then dropped the now-unnecessary `authenticated`-role
  write policies in new migration `0011_integrations_hardening.sql`.
  **Caught during the conversion, not after:** `deleteConnection` and the
  new `renameConnection` previously had no explicit `user_id` filter of
  their own — they relied entirely on RLS's `auth.uid() = user_id` policy to
  stop a user from touching another user's row by guessing an id. Moving
  them to the service-role client (which bypasses RLS) would have silently
  turned that into a real cross-user vulnerability if the `.eq("user_id",
  userId)` filter weren't added explicitly at the same time — added to both.
  Read access unchanged.
  **PKCE — verified already correct, then cleaned up:** `lib/integrations/
  crypto.ts::generateCodeVerifier`, `oauth.ts::requiresPkce`/
  `buildAuthorizeUrl` (real S256 challenge from a genuine per-request
  verifier), and both OAuth routes threading a verifier end-to-end were all
  already present and correct on disk. The one real issue: X's static
  provider config still carried a hardcoded fake
  `code_challenge: "challenge", code_challenge_method: "plain"` — vestigial,
  since `buildAuthorizeUrl` already deleted and overrode it whenever a real
  verifier was supplied, but confusing to read and a landmine for anyone who
  removed the override logic later. Removed it and added a declarative
  `pkce?: boolean` field to `OAuthProviderConfig`, so `requiresPkce()` reads
  config instead of a hardcoded `platform === "x"` check — matches this
  file's own stated principle ("adding a 7th platform is one config object,
  never a hardcoded conditional").
  **Revocation, made real for 2 more platforms:** the generic
  `revokeAccessToken()` assumed one request shape (`POST {url}?token=...`,
  matching Google's real API) for every provider — before this sprint, only
  YouTube actually had a `revokeUrl` configured; Instagram/Facebook/LinkedIn/
  X/Threads silently no-op'd (safe, since disconnecting still deletes
  UniPost's own copy of the token immediately regardless — but not the same
  as the provider itself also revoking access). Meta's Graph API
  (Instagram/Facebook/Threads — same platform family, same shape) uses
  `DELETE .../me/permissions?access_token=...` instead, no separate
  credentials needed since the token self-authenticates the call — added a
  `revokeMethod: "meta" | "google"` discriminator and implemented both
  shapes correctly. LinkedIn/X's revoke endpoints need client credentials in
  a form body (a third, different shape) — left as the existing safe no-op
  rather than guess at a shape without a real app to verify it against;
  documented as a scoped decision, not an oversight.
  **Account management (Phase 4):** `connected_accounts` gained `nickname`
  (cosmetic local label, never sent to the provider) and `is_default`
  (which account a platform's actions use by default when more than one is
  connected), the latter enforced to at most one per (user, platform) by a
  partial unique index, not application code alone. The first account
  connected to a platform is auto-marked default; disconnecting a default
  account promotes the next-oldest surviving one automatically. Multiple
  accounts per platform were already supported at the schema level since
  Sprint 7 (`unique(user_id, platform, account_id)`) — this sprint added the
  "which one is primary" concept on top. New `setDefaultAction`/
  `renameAction` server actions; `ConnectionCard` gained inline nickname
  editing + a "Set as default" control, `AccountSelector` shows nicknames
  and a default star.
  **Dashboard (Phase 7):** `profile_image` has been fetched and stored since
  Sprint 7 but was never actually rendered anywhere — both `PlatformCard`
  (platform grid) and `ConnectionCard` (detail view) showed only the
  platform's own brand glyph, never the connected account's real avatar. Now
  shown, with the glyph as fallback when no image exists. `PlatformCard`'s
  "primary" account for a platform now prefers the one flagged `is_default`
  instead of just whichever connection happened to be created first.
  **Future platforms:** TikTok and Pinterest already had `FUTURE_PLATFORMS`
  UI entries (Sprint 7) but no provider config. Added
  `FUTURE_PROVIDER_CONFIGS` — same shape as the real `OAuthProviderConfig`,
  real documented endpoints (TikTok Login Kit, Pinterest API v5) —
  deliberately kept **out** of `PROVIDER_CONFIGS`/`PlatformId` rather than
  widening that union: `PlatformId` is exhaustively matched across
  scheduling, the composer, and analytics, and neither platform is actually
  connectable yet, so widening it would ripple into three subsystems this
  sprint explicitly doesn't touch, for zero functional gain until a future
  sprint actually wires up scheduling/composing for them.
  `tsc` clean. `next build`'s compile + lint + type-check phase succeeded
  cleanly on **every attempt** this sprint (2/2). **Live/preview
  verification was blocked again by the same local environment fault
  flagged in last sprint's log entry** — `next build`'s later "Collecting
  page data" phase and the dev server both hit `Cannot find module` errors
  for core Next.js/React files (confirmed via a rendered error overlay this
  time, not just logs) that demonstrably exist on disk. This is a
  **recurrence**, not a new issue: `.next` had reverted to a plain in-place
  folder again (the junction workaround was re-applied, same as last
  sprint), and the deeper module-resolution fault persisted regardless.
  What *was* confirmed, from server logs even under the broken render
  state: an unauthenticated request to `/integrations` correctly produced
  `GET /login?redirect=%2Fintegrations`, proving the routing/middleware
  logic itself (untouched this sprint) is correct — only the page-render
  step is affected by the environment fault. See the known-risks list for
  the still-unresolved recommended fix.
  **⚠ Needs migration `0011_integrations_hardening.sql`.**
- **Integration Sprint 1 — Identity, RBAC & Real User Profiles ✅:** New migration
  `0010_profiles.sql` — `profiles` table (id/email/display_name/username/avatar_url/
  bio/timezone/role/plan/creator_score/xp/subscription_status), replacing
  `app_metadata` + the `ADMIN_EMAILS` env allow-list as the source of truth for
  role and plan (a gap tracked since Sprint 1). **Security design (applying Sprint
  8's billing-RLS lesson from day one, not as a follow-up fix):** a blanket own-row
  RLS update policy would let a user grant themselves admin by writing their own
  `role` column directly. Instead of a "no write policy at all, service role only"
  pattern (which would force the genuinely-safe self-editable fields — display
  name, username, avatar, bio, timezone — through a second API surface too), this
  uses a `BEFORE UPDATE` trigger that snaps the privileged columns
  (`role`/`plan`/`creator_score`/`xp`/`subscription_status`/`id`/`email`) back to
  their previous value whenever the write comes from a normal `authenticated`
  session (`auth.role() = 'authenticated'`) — service-role writes pass through
  untouched. One simple `.update()` from the client works for the safe fields and
  is a silent no-op for the privileged ones, instead of either blocking both or
  allowing both. `on_auth_user_created` trigger (`security definer`, fires `after
  insert on auth.users`) auto-creates a profile for every signup — email,
  Google OAuth, any future method — so there's no app-code path that can forget
  to create one; a one-time backfill seeds profiles for every pre-existing user
  from their current JWT claims (so no already-promoted admin gets demoted, no
  paying user gets reset to free). `private.is_admin()` (Sprint 9) repointed from
  reading the JWT's `app_metadata.role` claim to querying `profiles` directly —
  the JWT-claim version could stay valid for a demoted admin until their token
  next refreshed; the table read is correct on the very next request.
  **Application layer:** `lib/auth/role.ts` lost `getRole(user)`/`getPlan(user)`
  entirely — role/plan/name/avatar/score/xp all come from one `lib/db/
  profiles.ts::getOwnProfile()` call now (React `cache()`-wrapped, same pattern as
  the pre-existing `getCurrentUser`, so the root layout + a nested admin layout +
  the page itself share one query instead of firing three). `isAdmin`/`hasRole`
  are now pure sync predicates over an already-resolved `Role`, not functions that
  read a Supabase `User` object. Every call site updated: `(app)/layout.tsx`,
  `(app)/admin/layout.tsx`, `(app)/admin/actions.ts::guardAdmin()`,
  `(app)/dashboard/page.tsx`. `lib/db/admin/users.ts`'s `listUsers`/`getUserDetail`
  now batch-join `profiles` (one query per page, same philosophy as the existing
  `subscriptions`/`ai_credit_history`/`connected_accounts` joins) instead of
  calling `getRole`/`getPlan` in a loop — and no longer need a separate
  `creator_scores`/`xp_history` query at all, since `profiles.creator_score`/`.xp`
  are kept in sync. `changeUserRole` now writes `profiles.role` via a new
  `setRole()` instead of the Admin Auth API's `app_metadata`; `syncPlanMetadata`
  (the `app_metadata.plan` writer) is gone — `setPlan()` replaces every call site
  (`confirmPayment`, `adminConfirmPayment`, `applyPeriodRollover`, `adminSetPlan`,
  `overrideUserPlan`).
  **Middleware gained a third defense layer:** previously only page-level
  (middleware: authenticated or not; layout: role check). `updateSession()` now
  also returns the request-scoped Supabase client itself, so middleware can run
  one extra `profiles.role` query scoped to just `/admin/*` paths (every other
  request skips it) and redirect a creator to `/dashboard` at the edge, before
  any admin page or data ever renders — not just at the layout.
  **Dashboard:** `CreatorScorePreview` read a hardcoded mock summary despite
  Sprint 6's real Creator Score system existing since — now takes real `score`/
  `level`/`progress` props from `syncGrowth()`'s bundle (already fetched on that
  page, just not threaded through). `syncGrowth()` gained a best-effort
  `syncScoreAndXp()` call so `profiles.creator_score`/`.xp` stay fresh for other
  readers (admin table, future sidebar use) without the dashboard itself
  depending on the cache — it reads the live `bundle` values directly, which are
  fresher. `AppUser` gained `username`/`creatorScore`/`xp`. `avatarUrl` had
  existed on `AppUser` conceptually but was never wired to a real avatar image —
  wired it into `UserMenu`'s account button (falls back to initials), with an
  explicit `aria-label` on the button itself so it isn't accessible-name-less the
  moment an avatar image is present.
  **`/settings`** replaced its `ComingSoonCard` (blocked on `profiles` not
  existing, per its own placeholder copy) with a real profile-edit form —
  display name, username, avatar URL, bio, timezone (the full canonical IANA
  list via `Intl.supportedValuesOf`, not a hand-maintained one). Noticed the
  exact same `Field`/`SubmitButton` form markup had already been independently
  duplicated twice (`AuthForm.tsx`, `ResetPasswordForm.tsx`) before this made a
  third copy — extracted `components/ui/FormField.tsx` and refactored both
  existing forms onto it instead, net negative diff.
  **First-admin bootstrap:** deliberately no code-level or env-var backdoor (the
  brief's explicit "never hardcode an admin email" rule) — promote one directly
  via the Supabase SQL editor
  (`update public.profiles set role = 'admin' where email = '...'`); every admin
  after that is created through the admin panel itself.
  `tsc` clean, `next build` green (32 routes; `/settings` 2.54 kB, up from a
  184 B placeholder). Live verification limited to the unauthenticated boundary
  (no live Supabase session available in this sandbox): confirmed `/dashboard`,
  `/admin`, and `/settings` all correctly redirect to `/login`, no console/server
  errors. The full register→profile-created→dashboard-real-data→role-enforcement→
  logout chain the brief's success metric describes is architecturally complete
  but **unverified end-to-end live** — flagged as the top follow-up.
  **⚠ Needs migration `0010_profiles.sql`.**
- **Sprint 10 — Production Hardening & Launch Readiness ✅ (RC1):** No new features —
  audit + harden. **Security (the critical findings):** discovered migration `0007`
  gave `subscriptions`/`payments`/`invoices`/`ai_credit_history`/`usage_metrics`/
  `billing_events` a blanket own-row INSERT/UPDATE/DELETE policy, meaning any
  authenticated user could `supabase.from('subscriptions').update({plan:'agency'})`
  directly from a browser, bypassing `confirmPayment`'s Razorpay signature check
  entirely — a full paywall + AI-credit-limit bypass. Fixed in two parts: moved every
  write in `lib/db/billing.ts` (`confirmPayment`, `grantCredits`, `cancelSubscription`,
  etc.) from the request-scoped client to the service-role admin client — same pattern
  already proven safe by the pre-existing `adminConfirmPayment` webhook path, still
  gated by `uid()`/explicit `user_id` filters in application code — then dropped the
  now-unnecessary `authenticated`-role write policies in new migration
  `0009_security_hardening.sql`. (`spend_credits` stays on the request-scoped client —
  its `security definer` body re-checks `auth.uid()` itself and needs the real JWT.)
  Also fixed: an open redirect in `mockDeny` (`//evil.com` passed a naive
  `startsWith("/")` check; extracted the already-correct guard from `(auth)/actions.ts`
  into a shared `lib/utils.ts::isSafeRedirect()` so it can't drift a third time); the
  admin route middleware only fast-path-protected `/dashboard` (a stale `/app` entry
  matched nothing real, since route groups don't appear in URLs) — replaced with a
  public-path allow-list so every current/future `(app)/*` page is protected by
  default; `/api/ai/chat` failed **open** on a transient credit-balance-check error
  (let exactly one free message through per hiccup, indefinitely under sustained load)
  — now fails closed; added Zod length caps (`lib/validations/ai.ts`) to the chat
  message, `runAction`'s input and `savePrompt`, none of which had any runtime
  validation despite being network-callable directly. `next.config.mjs` gained a real
  CSP + standard security headers (previously none existed) — allow-lists Supabase and
  Razorpay's known origins by name; `'unsafe-eval'` stays for Three.js/webpack HMR
  compatibility, a deliberate relaxation, not an oversight. `.env.example` contained
  what looked like real Supabase/Gemini credentials instead of placeholders — confirmed
  via `git status` that the file was still untracked (never committed, never reached
  `origin/main`), replaced with generic placeholders before that could happen.
  Upgraded `next` 14.2.18→14.2.35 (patch only, same major) after `npm audit` surfaced
  it was vulnerable to, among others, the well-known Next.js middleware
  authorization-bypass CVE (GHSA-f82v-jwr5-mffw) — directly relevant given this
  sprint's own middleware changes; did **not** force-upgrade to the Next 16 line
  `npm audit fix --force` suggested, since that's a breaking major-version jump this
  sprint's "don't rewrite working systems" instruction rules out without dedicated
  regression-testing time (remaining advisories documented as a known risk instead).
  `(app)/layout.tsx` had no `metadata` export at all, so every authenticated page
  (including all of `/admin/*`) inherited the root layout's `robots:{index:true}` —
  added an explicit `noindex` there, plus new `app/robots.ts`/`app/sitemap.ts`
  disallowing/excluding the same authenticated surface. **Performance:** `gsap`/
  `ScrollTrigger` were statically imported into `AppProviders.tsx` (mounted in the root
  layout, shared by every route), forcing the whole library into every authenticated
  page's bundle even though only the landing page's own section components use it —
  switched to a dynamic `import()` inside the same `useEffect`, mirroring the pattern
  `hooks/useLenis.ts` already used correctly; zero behavior change (verified via
  preview), landing page's own route chunk absorbed the weight instead of the shared
  chunk. Removed the unused `@react-three/drei` dependency (zero imports anywhere).
  **Error handling:** added a root `app/error.tsx` (previously only `(app)/error.tsx`
  existed — an error on the landing page or in `(auth)/*` had no boundary at all) and
  `app/global-error.tsx` (the last-resort boundary if the root layout itself throws;
  deliberately renders zero app dependencies, since if the root layout broke, anything
  relying on it could too); new `lib/monitoring/logger.ts` — a vendor-agnostic
  logging seam (swap the body once for Sentry/etc. later, no call-site changes) wired
  into all three error boundaries plus the Razorpay webhook's catch block, replacing
  bare `console.error` calls; new `useOnlineStatus`/`OfflineBanner` (mounted globally)
  for a mobile-first, connectivity-variable audience. Deliberately did **not** build a
  global toast-notification system — every existing form already has a consistent
  inline error/success-message pattern (verified across `ForgotPasswordForm`,
  `ConfirmDangerModal`, billing/moderation actions); adding a second, parallel
  notification pattern this late would be inconsistency, not hardening.
  **Accessibility:** fixed 2 icon-only buttons with zero accessible name in
  `ModerationPageClient.tsx` (shipped in Sprint 9); a `<h4>` immediately following an
  `<h2>` in `Footer.tsx` (skipped `<h3>` — pure text styling, no visual change from the
  fix); the landing-page `Loader` overlay left `<main>`'s real buttons focusable
  underneath it during the ~3.2s load (`inert` now applied — note: `@types/react`
  types `inert` as `boolean`, but React 18's runtime, unlike 19+, doesn't
  special-case it as one, so the JS boolean `true` literally serializes as the
  string `"true"` instead of a present/absent attribute; needed a cast to keep the
  correct runtime output); `aria-selected` on a plain `<button>` in
  `SchedulerStudio.tsx` (invalid outside `role="tab"`/`option`/etc. — added
  `role="tablist"`/`role="tab"`). **Tooling:** discovered `next lint` had never
  actually run in this project's history — no ESLint config existed at all (`next
  lint` prompted interactive setup), and `eslint`/`eslint-config-next` weren't even
  installed, meaning every prior sprint's "build green" only ever reflected
  type-checking. Installed both + a standard `next/core-web-vitals` config; the first
  real lint pass surfaced 6 genuine `react/no-unescaped-entities` errors (raw
  apostrophes in JSX text — fixed, zero behavior change) and 1
  `jsx-a11y/role-supports-aria-props` warning (the `SchedulerStudio` fix above); left
  the landing page's pre-existing `Particles.tsx` `exhaustive-deps` warnings
  untouched (WebGL code, "don't touch landing page animations"). **Dead code:**
  removed 6 confirmed zero-importer functions (`listUpcoming`/`listLogs` in
  `lib/db/schedule.ts`, `getConversation` in `lib/db/ai.ts`, `markPaymentFailed` in
  `lib/db/billing.ts` — distinct from the actually-used `adminMarkPaymentFailed` —
  `priceInPaise` in `lib/billing/plans.ts`, `checkCredits`/`CreditCheck` in
  `lib/billing/credits.ts`) and 5 unused exports from `lib/billing/gates.ts`
  (`canConnectAnotherAccount`/`canScheduleAnotherPost`/`canUseStorage`/
  `hasPrioritySupport`/`teamSeatLimit` — real functioning duplicates of this logic
  already live, tested, and actually called inline in `lib/db/schedule.ts`/
  `lib/db/integrations.ts`; kept those working versions, removed the never-exercised
  twins rather than risk swapping tested call sites for untested ones). **SEO:**
  `config/site.ts`'s `ogImage: "/og.png"` pointed at a file that never existed —
  every social share showed a broken image. Tried a code-generated favicon + OG image
  via `next/og`'s `ImageResponse`; both failed to prerender locally with `TypeError:
  Invalid URL` deep inside `@vercel/og`'s bundled font loader (same family of issue as
  this project's pre-existing `.next`/OneDrive junction workaround) — reverted to a
  static `app/icon.svg` (same aurora-gradient mark as the navbar logo) and dropped the
  OG image entirely rather than ship something that couldn't be verified to build;
  documented as a follow-up (untested whether the dynamic version works on Vercel's
  Linux build servers). **Documentation:** `README.md` didn't exist at all — added one
  (setup, env vars, project structure, deployment, troubleshooting). `ARCHITECTURE.md`
  was frozen at Sprint 1–2 (never mentioned Sprints 3–9's routes, the data-layer
  pattern, or the admin/service-role client split) — substantially updated to reflect
  the current, full architecture. `tsc` clean, `next build` green (32 routes), `next
  lint` clean (first real pass in project history). **⚠ Needs migration
  `0009_security_hardening.sql`** (additive-only — drops write policies that nothing
  legitimate used, per the client-conversion above; read access unchanged).
- **Sprint 9 — Admin Control Center ✅:** DB migration `0008_admin.sql` — new `private` schema +
  `private.is_admin()` helper (plain SQL, reads `auth.jwt() -> 'app_metadata' ->> 'role'` — never
  `user_metadata`, which is user-editable — `stable`, `set search_path = ''`, granted to
  `authenticated` only). 5 new tables: `audit_logs`, `system_events`, `feature_flags` (seeded with
  4 well-known keys), `platform_health`, `support_tickets` (future-ready — schema only, no UI yet).
  **New RLS pattern vs. every prior migration:** these are admin-scoped, not own-row — policies gate
  on `(select private.is_admin())` (the `(select ...)` wrapper is Supabase's documented perf pattern:
  evaluated once per query, not per row) and there are deliberately **no `authenticated`-role write
  policies** — all writes go through the service-role admin client from trusted server code only.
  Also added admin-read policies to the pre-existing `billing_events`/`integration_events`/
  `sync_logs` tables (purely additive — an extra `or (select private.is_admin())` read path,
  existing own-row policies untouched) after catching that the unified audit timeline would
  otherwise have silently shown only the viewing admin's own billing/integration/sync activity
  instead of platform-wide history. Small compatible extensions: `ai_generations.duration_ms`
  (response-time tracking) and `posts.flagged`/`posts.moderation_note` (+ partial index) for
  moderation. Data layer: `lib/db/admin/{users,overview,billing,ai,health,moderation,flags,audit}.ts`
  — all admin cross-user reads/writes go through `lib/supabase/admin.ts` (Sprint 8); `audit_logs`
  reads instead use the request-scoped client, relying on its own RLS policy (defense in depth).
  `logAudit()` is best-effort (never throws, same idiom as XP/history writes since Sprint 4) and is
  now called from the login/OAuth-callback/password-reset flows and both AI failure points
  (`(app)/ai/actions.ts`, `/api/ai/chat`) — the latter also required adding `duration_ms` to make
  Phase 4's "response time"/"failure rate" real numbers instead of placeholders. Also shipped the
  password-reset flow itself (`requestPasswordReset`/`updatePassword` server actions,
  `/forgot-password` + `/reset-password` pages) — a gap flagged since the Sprint 1 QA gate — reusing
  the existing `/auth/callback?next=` mechanism rather than adding a second callback path. Refunds
  (`adminRecordRefund`) are deliberately bookkeeping-only (`payments.status='refunded'`) — no live
  Razorpay refund API call, per the standing rule against autonomous real-money operations.
  Maintenance mode is enforced in `(app)/layout.tsx` (not edge `middleware.ts`, to avoid adding
  latency/failure risk to every request app-wide), admins always exempt. 12 admin components
  (`AdminSidebar`, `AdminHeader`, `StatusBadge`, `AdminStatCard`, `ActivityFeed`, `AuditTimeline`
  [day-grouped wrapper over `ActivityFeed`, not a re-implementation], `LogViewer`, `ConfirmDangerModal`
  [typed-phrase confirmation, gates delete/suspend/refund], `UserTable`, `UserDetailPanel`,
  `RevenueCard` [reuses Sprint 6's `BarChart`], `HealthCard`, `SystemHealthPanel`,
  `FeatureFlagCard`, `BulkActionBar`, `ModerationPageClient`, `MaintenanceScreen`). Bulk *delete* is
  deliberately not exposed from either the Users list or the Moderation queue bulk-action bar —
  judged too dangerous to expose as a multi-select action; single-item delete only, always behind
  `ConfirmDangerModal`. Fixed two pre-existing bugs surfaced by this sprint's `tsc --noEmit`: `lib/
  admin/csv.ts::toCsv`'s generic constraint (`T extends Record<string, unknown>`) rejected any
  plain `interface` without an index signature, which silently broke Phase 2's user CSV export too;
  and `tsconfig.json` had no `target` (defaulting to ES3), which made `[...set]` spread syntax a
  type error — added `"target": "es2017"` (Next's SWC compiler, not `tsc`, controls actual build
  output, so this only affects type-checking diagnostics). `tsc` clean, `next build` green (29
  routes; `/admin/moderation` 7.9 kB, `/admin/audit` 3.4 kB, `/admin/settings` 2.8 kB). Live
  verification limited to what's reachable without a real Supabase session (same constraint as every
  prior sprint in this environment): confirmed unauthenticated `/admin` → 307 → `/login`, and that
  `/login`/`/forgot-password`/`/reset-password` render cleanly with no console/server errors. The
  gated admin pages themselves are unverified in-browser this sprint — verification relied on `tsc`
  + `next build` + manual signature cross-checks between client components and server actions
  (caught `listPostsForModeration`'s filters/limit argument shape this way before it shipped).
  **⚠ Needs migration `0008_admin.sql`.**
- **Sprint 8 — Billing, Subscriptions & AI Credit System ✅:** DB migration `0007_billing.sql` — 6
  tables (`subscriptions` [one per user, auto-provisioned free on first read], `payments`,
  `invoices`, `ai_credit_history` [append-only ledger, same shape as `xp_history`], `usage_metrics`
  [monthly snapshot], `billing_events` [lifecycle audit trail]) with indexes, own-row RLS, and a
  `spend_credits(user_id, amount, reason, key, meta)` **security-definer Postgres function** —
  advisory-locked per user (`pg_advisory_xact_lock`) so concurrent AI calls can't race past a
  balance check, and explicitly verifies `p_user_id = auth.uid()` inside the function body (caught
  during review — bypassing RLS via `security definer` without that check would let any
  authenticated user drain another user's credits). New `lib/supabase/admin.ts` (service-role
  client) for the two legitimate privileged paths: syncing `app_metadata.plan` (a user can never
  self-edit `app_metadata` — that's the point) and the Razorpay webhook, which arrives with no
  UniPost session at all so RLS can't apply. **Plan resolution:** `subscriptions` table is the real
  source of truth; `lib/auth/role.ts::getPlan()` (existing, metadata-based, used in ~5 places
  app-wide) is kept as a fast synchronous read, written-through on every real plan change instead of
  replaced — avoids a DB round-trip on every page load while staying eventually consistent.
  Config-driven pricing engine (`lib/billing/plans.ts` — `PLAN_LIMITS`, never a hardcoded number
  elsewhere) + reusable gates (`lib/billing/gates.ts`). Razorpay engine (`lib/billing/razorpay.ts`)
  — real order-creation/signature-verification/webhook-verification, **config-gated to an in-app
  mock checkout** (`MockCheckoutModal`) when no real credentials exist, same stub philosophy as
  Sprint 5/7; the mock "Pay" button flows through the *exact same* server-side `confirmPayment`
  verify→activate path a real Razorpay success handler would use. Credit gate wired as a real,
  enforced block (not cosmetic) into `runAction` and `/api/ai/chat` (balance checked before
  spending a Gemini call; atomic deduct after). Plan caps wired into `lib/db/schedule.ts::
  createSchedules` (Sprint 5) and `lib/db/integrations.ts::completeConnection` (Sprint 7) via a new
  leaf module `lib/db/plan.ts` (avoids an import cycle with `lib/db/billing.ts`, same fix pattern as
  Sprint 6's `lib/db/xp.ts` extraction). Analytics page's day-range selector is now plan-capped
  (7/90/365d) — the one Sprint 6 view this sprint deliberately narrows, framed as historical-depth
  gating, not hiding the always-visible 30-day headline KPIs. 10 billing components
  (`SubscriptionBadge`, `CreditMeter`, `UsageProgress`, `PlanCard`, `PlanComparison`,
  `UpgradeBanner`, `InvoiceCard`, `PaymentMethodCard`, `UsageCard`, `BillingCard`) +
  `MockCheckoutModal`. `/billing` replaces the ComingSoon stub; `SubscriptionStatus` (dashboard
  widget) now reads real credit data instead of `lib/mock/dashboard`. `tsc` clean, `next build`
  green (21 routes; `/billing` 11 kB).
  **⚠ Needs migration `0007_billing.sql`.** Razorpay credentials optional (falls back to mock
  checkout); `RAZORPAY_WEBHOOK_SECRET` only matters once a real webhook URL is registered.
- **Sprint 7 — Social Integration Platform ✅:** DB migration `0006_integrations.sql` — 5 tables
  (`connected_accounts`, `oauth_tokens` separated from account profiles for tighter select-hygiene,
  `platform_permissions`, `sync_logs`, `integration_events`) with indexes, `set_updated_at` triggers,
  own-row RLS. New security infra: `lib/integrations/crypto.ts` — AES-256-GCM token encryption +
  HMAC-signed OAuth state, both purpose-separated via HKDF from one root secret
  (`INTEGRATIONS_SECRET_KEY`); fails closed (throws, never stores plaintext) if unconfigured.
  Config-driven OAuth engine (`lib/integrations/providers.ts` — one declarative config per platform,
  real endpoint shapes for Instagram/Facebook/LinkedIn/X/Threads/YouTube; `lib/integrations/oauth.ts`
  — generic authorize/exchange/refresh/revoke functions that never branch on platform). No real
  developer-app credentials exist, so — mirroring Sprint 5's publishing stub — connecting runs
  through an **internal mock consent screen** (`(app)/integrations/connect/[provider]`) that
  round-trips through the exact same `/auth/oauth/[provider]/callback` route a real provider would
  use, producing a deterministic per-user stub identity. Adding real credentials to `.env.local`
  switches the same code to real HTTP calls — no code changes. Sync Engine (`lib/integrations/
  sync.ts` — retry/backoff, expiry checks, auth-vs-transient error classification;
  `lib/db/integrations.ts::syncAccount` — orchestrates refresh + profile re-fetch + logging).
  Capability system extends `config/platforms.ts` (not a second registry) with a `Capability` union
  + `hasCapability()`. Publishing adapter (`lib/schedule/publishing.ts`, extended in place from
  Sprint 5) gained `schedule/update/delete/validate/preview` alongside `publish` — widened from
  `ScheduledPost` to `ScheduledEvent` (the type already flowing through its one call site) so
  validate/preview can see real post content; `SchedulePostRef` gained `media`. 13 components
  (`ConnectionStatus`, `SyncBadge`, `PermissionCard`, `CapabilityList`, `OAuthButton`, `PlatformCard`,
  `ConnectionCard`, `AccountSelector`, `ReconnectModal`, `DisconnectModal`, `SyncHistory`,
  `IntegrationsHub`, `MockConsentScreen`). `/integrations` replaces the connections half of the
  `/settings` stub; nav updated. `tsc` clean, `next build` green (20 routes; `/integrations` 10.3 kB).
  **⚠ Needs migration `0006_integrations.sql` + `INTEGRATIONS_SECRET_KEY`** (real per-platform OAuth
  credentials are optional — omitted ones fall back to the mock consent screen).
- **Sprint 6 — Creator Intelligence Engine ✅:** DB migration `0005_growth.sql` — 6 tables
  (`analytics_daily`, `creator_scores`, `xp_history`, `achievements`, `goals`,
  `growth_recommendations`) with indexes, partial-unique idempotency indexes (one active
  recommendation per kind; one XP award per natural key), `set_updated_at` triggers, own-row RLS.
  Reusable services in `lib/growth/*`: `stats` (pure aggregator — streaks, rates, best
  platform/hour — from real posts/schedules/AI usage), `score` (7-factor weighted Creator Score +
  letter grade), `xp` (leveling curve, once-per-day/action idempotency keys), `achievements`
  (static catalog + pure unlock checks), `goals` (progress/completion), `recommendations` (8-rule
  engine), `simulate` (**stub** — deterministic per-user analytics generator, seeded once and
  extended forward per day, same stopgap pattern as Sprint 5's publishing stub), `performance`
  (estimates per-post reach/engagement by distributing each day's platform analytics across that
  day's actual published posts — real activity, honestly-labeled proxy metric), `aggregate` (chart
  data shaping). Orchestrated by `lib/db/growth.ts::syncGrowth()` — one entrypoint the
  analytics/score/coach pages call that seeds analytics, computes/persists the daily score, awards
  real XP (small additive hooks in `publishNow`, `createSchedules`, AI `runAction`, and the chat
  route — all best-effort, matching Sprint 4's history-write idiom), unlocks achievements,
  recomputes goal progress, and refreshes recommendations. Hand-rolled SVG chart system (no new
  dependency): `TrendChart` (line/area, single/multi-series), `BarChart`, `PieChart`,
  `CalendarHeatmap`, `PublishingTimeline`, `PlatformComparison`, `ChartContainer`. 15 growth
  components (`AnalyticsCard`, `MetricGrid`, `InsightCard`, `CreatorScoreCard`, `XPBar`,
  `AchievementCard`, `GoalCard`, `RecommendationCard`, `GrowthCoachCard`, `ScorePageClient`,
  `AnalyticsPageClient`, + the 7 chart components above). `/analytics`, `/score`, `/coach` replace
  their ComingSoon stubs. `/ai` extended to accept a `?prompt=` deep link so "Ask the coach" reuses
  the existing AI Studio conversation system instead of a second chat stack. `tsc` clean, `next
  build` green (19 routes; `/analytics` 7.4 kB, `/score` 6.8 kB, `/coach` 4.1 kB).
  **⚠ Needs migration `0005_growth.sql`.**
- **Sprint 5 — Publishing Engine & Smart Scheduler ✅:** DB migration `0004_scheduling.sql` —
  `scheduled_posts` (one row per post×platform, Buffer-style per-channel scheduling: status,
  priority, position, retry_count/max_retries, error, published_at) + `publishing_logs` (audit
  trail) + own-row RLS + `publishing_queue` view (derived, RLS-scoped via explicit `auth.uid()`
  predicate). Reusable services in `lib/schedule/*`: `timezone` (Intl-only zoned↔UTC conversion,
  no date library), `calendar` (pure local-time grid math), `scheduling` (validation, best-time
  suggestions), `queue` (pure grouping/sorting/reordering), `publishing` (**stub** — `PlatformPublisher`
  registry future integrations plug into), `reminders` (pure derivation from schedule state), `status`
  (lifecycle → color/icon/label metadata). Typed data layer (`lib/db/schedule`, syncs parent `posts.status`
  from its schedules) + Server Actions (`(app)/calendar/actions`, Zod-validated via
  `lib/validations/schedule`). Client `SchedulerStudio` (tabs Calendar·Queue) holds state locally for
  optimistic CRUD; `Calendar` renders month/week/day/agenda with native drag-and-drop reschedule,
  pointer-based resize, lane-packing for overlaps, and today highlight — all in the browser's local
  timezone while the DB stores UTC + the chosen IANA zone. `ScheduleModal` supports **bulk scheduling**
  (multi-select drafts → one platform set + time, scheduled in parallel). 15 new components (`Calendar`,
  `CalendarToolbar`, `CalendarEvent`, `ScheduleModal`, `RescheduleModal`, `TimePicker`,
  `TimezoneSelector`, `ScheduledPostCard`, `QueueCard`, `QueueManager`, `PublishingStatus`,
  `RemindersPanel`, `UpcomingPostsWidget`, `SchedulerStudio`). Creator Studio's Schedule button
  (previously disabled) now saves-then-opens `ScheduleModal` locked to the current post. `/calendar`
  replaces the ComingSoon stub. `tsc` clean, `next build` green (19 routes; `/calendar` 10.3 kB).
  **⚠ Needs migration `0004_scheduling.sql`.**
- **Sprint 4 — AI Studio & Content Engine ✅:** reusable Gemini service via raw REST/SSE, no SDK
  (`lib/ai/gemini` — `generateText` with 429/5xx retry + `streamGemini` async generator; `models`,
  `prompts` 13-action engine, `templates`). DB migration `0003_ai.sql` — 4 tables
  (`ai_conversations`/`ai_messages`/`saved_prompts`/`ai_generations`) with indexes, `set_updated_at`
  triggers, and own-row RLS. Typed data layer (`lib/db/ai`) + Server Actions (`(app)/ai/actions`) +
  streaming Route Handler (`app/api/ai/chat`, persists both turns, returns `x-conversation-id`,
  supports regenerate). Client `AIStudio` (tabs Chat·Templates·Prompts·History) holds all state
  locally for optimistic CRUD + streaming via `fetch`+`AbortController`. 12 AI components
  (`MarkdownRenderer`, `StreamingText`, `TypingIndicator`, `ModelSelector`, `AIMessage`,
  `PromptInput`, `ConversationSidebar`, `AIChat`, `TemplateCard`, `PromptCard`, `GenerationHistory`,
  `AIStudio`). Smart Editor: `AISelectionMenu` wired into `PostEditor` (highlight → Ask AI →
  replace/append; every run saved to history). `/ai` replaces the ComingSoon stub. `tsc` clean,
  `next build` green (19 routes; `/ai` 13 kB). **⚠ Needs `GEMINI_API_KEY` + migration `0003_ai.sql`.**
- **Pre-Sprint (audit):** reconciled false "auth completed" claim; created context docs.
- **Sprint 1 — Authentication ✅:** Supabase `@supabase/ssr` integration, email/password
  + Google OAuth via Server Actions (Zod-validated), two-layer route protection
  (middleware + server component), auth UI inheriting the design system, protected
  dashboard shell. `tsc` clean, `next build` passing (9 routes).
- **Sprint 1 — QA Gate (SPRINT-001) ✅ PASS:** full security/architecture audit — 0 critical
  issues; `getUser()`-based authz, open-redirect + email-enumeration guards, service-role
  never client-exposed, CSRF via Server Actions, defense-in-depth protection all verified.
  Health 90/100. One required functional follow-up: **password reset / forgot-password flow
  (not yet implemented).** No code changes needed to certify.
- **Sprint 3 — Creator Studio ✅:** `posts` table + RLS + `updated_at` trigger + `post-media`
  Storage (`supabase/migrations/0001–0002`); typed data layer (`lib/db/posts`) + Zod-validated
  Server Actions (`(app)/create/actions`) for full draft CRUD (create/edit/duplicate/soft-delete/
  restore/purge); studio UI (`components/studio/*`): `CreateStudio`, `PostEditor`, `PlatformSelector`,
  `MediaUploader`, `ContentCard` preview, counters, `SaveIndicator`, `ValidationMessage`,
  `PostActions`, `DraftCard`; autosave (`useDebouncedCallback`, 1.2s) + Ctrl+S + beforeunload guard;
  per-platform char/media limits. `/create` + `/posts` (with Trash) shipped. `tsc` clean, build green.
  **⚠ Run `supabase/migrations/*` before it works live** (see `supabase/README.md`).
- **Sprint 2 — App Shell & Dashboard ✅:** `AppShell` (sidebar + topbar) inheriting the design
  system; role-aware nav (`lib/auth/role`, `config/navigation`); dashboard home composed from 9
  reusable widgets over isolated mock data (`lib/mock/dashboard`); global component library
  (`PageHeader`, `WidgetContainer`, `StatCard`, `EmptyState`, `ComingSoonCard`, `QuickActionCard`,
  `InfoBanner`, `ActivityItem`, `Skeleton`, state screens); `loading`/`error`/`not-found`; 11
  routes (admin role-gated). React `cache()` dedupes the layout+page auth call. Removed orphaned
  `AppTopbar`. `tsc` clean, `next build` green (19 routes; app routes ~94 kB first-load).

## ⚙️ Supabase setup required before auth works end-to-end
1. Create a Supabase project → **Settings → API**: copy `URL`, `anon` key, `service_role` key into `.env.local`.
2. **Authentication → URL Configuration:** Site URL = `http://localhost:3000` (+ prod URL later);
   Redirect allow-list must include `http://unipost-seven.vercel.app/auth/callback` and `/auth/confirm`.
3. **Authentication → Providers → Google:** enable and paste Google OAuth client ID/secret.
4. (Optional) toggle "Confirm email" per preference. Restart `npm run dev` after editing `.env.local`.
5. **Run migrations `supabase/migrations/0001–0004`** (SQL editor or CLI) so posts + AI + scheduling tables exist.
6. **AI Studio:** add `GEMINI_API_KEY` to `.env.local` (Google AI Studio → API key). Without it, `/ai`
   loads but chat/tools return a friendly error; DB history still requires migration `0003_ai.sql`.
7. **Calendar/Scheduler:** needs migration `0004_scheduling.sql` only — no new env vars. Without the
   migration, `/calendar` still loads (empty) rather than erroring.
8. **Creator Intelligence:** needs migration `0005_growth.sql` only — no new env vars. Without it,
   `/analytics`, `/score` and `/coach` still load empty rather than erroring.
9. **Integrations:** run migration `0006_integrations.sql`, then set `INTEGRATIONS_SECRET_KEY` in
   `.env.local` (any 32+ char random string — e.g. `openssl rand -base64 32`; **required**, unlike
   other sprints' optional keys, since it encrypts stored tokens). Per-platform `*_CLIENT_ID`/
   `*_CLIENT_SECRET` pairs are optional — without them, "Connect" uses a simulated consent screen
   so the full flow still works end-to-end.
10. **Billing:** run migration `0007_billing.sql` — no new required env vars. `RAZORPAY_KEY_ID`/
    `RAZORPAY_KEY_SECRET` are optional (falls back to an in-app mock checkout so upgrade/downgrade/
    cancel/credits all work end-to-end without a real Razorpay account); `RAZORPAY_WEBHOOK_SECRET`
    only matters once you register a real webhook URL in the Razorpay dashboard.
11. **Admin Control Center:** run migration `0008_admin.sql` — no new env vars. To reach `/admin`,
    the signed-in user's `app_metadata.role` must be `"admin"` (Supabase dashboard → Authentication →
    user → edit `raw_app_meta_data`, or the `ADMIN_EMAILS` allow-list from Sprint 1 for first login).
    Without the migration, `/admin/*` will error on load rather than degrading gracefully — this is
    the one sprint so far where skipping the migration doesn't fail soft.
12. **Production Hardening:** run migration `0009_security_hardening.sql` — no new env vars, purely
    an RLS policy lockdown (see Sprint 10's log entry). Safe to run any time after `0007`; nothing
    breaks if you run it late, since the app code it depends on (service-role writes in
    `lib/db/billing.ts`) shipped in the same sprint as the migration.
13. **Identity & RBAC:** run migration `0010_profiles.sql` — no new env vars. To reach `/admin`, a
    user's `profiles.role` must be `"admin"` — there is **no** email allow-list or env var for this
    anymore. Promote the first admin directly in the Supabase SQL editor:
    `update public.profiles set role = 'admin' where email = 'you@example.com';`. Every admin after
    that can be created through the admin panel itself (Users → role change). Without this
    migration, every authenticated page errors (the app layout calls `getOwnProfile()`
    unconditionally) — unlike most prior migrations, this one does not fail soft.
14. **Social OAuth hardening:** run migration `0011_integrations_hardening.sql` — no new env vars,
    additive-only (new `nickname`/`is_default` columns + an RLS write-policy lockdown; nothing
    reads those two columns as `not null`-without-a-default, so existing rows don't need
    backfilling). Real per-platform OAuth apps remain fully optional (see setup step 9) — TikTok/
    Pinterest have provider *config* stubs (`lib/integrations/providers.ts::
    FUTURE_PROVIDER_CONFIGS`) but no connect UI yet, so `TIKTOK_CLIENT_ID`/`PINTEREST_CLIENT_ID`-
    shaped env vars in `.env.example` don't do anything yet even if set.

## Known risks / follow-ups
- **⚠ Recurring local build/dev-server fault — second occurrence, still unresolved.** `next build`'s
  "Collecting page data" phase and `next dev` both intermittently fail with `Cannot find module`
  for core Next.js/React files (`react/jsx-runtime`, `next/dist/compiled/next-server/*`) that
  demonstrably exist on disk — confirmed this sprint via a rendered browser error overlay, not just
  logs. `tsc --noEmit` and `next build`'s compile+lint+typecheck phase are unaffected and have
  succeeded on every attempt across both sprints this has occurred in. Also confirmed again this
  sprint: `.next` had silently reverted from the documented junction (`%TEMP%\unipost-next`) back to
  a plain in-place folder — re-applying the junction is necessary but **not sufficient**; the deeper
  fault persists after re-applying it. Suspected cause: OneDrive actively syncing/locking files
  inside `node_modules` (which — unlike `.next` — has never been relocated outside the synced
  folder) during the build/dev-server's parallel worker phase. **Recommended fix, still not
  attempted:** pause OneDrive sync entirely during development, or relocate `node_modules` outside
  `C:\Users\...\OneDrive\...` the same way `.next` already is (e.g. a junction, or an npm/pnpm
  config that installs elsewhere), or at minimum confirm whether a `rd /s /q node_modules && npm
  install` produces a tree OneDrive stops interfering with. Until one of these is tried, expect
  every sprint's live-preview verification to be unreliable regardless of code correctness.
- **⚠ This project's `Unipost/.env.local` and `.claude/launch.json` (at the parent working-
  directory root) did not exist at the start of this sprint** — a separate tool ("antigravity")
  had reverted the whole project folder to its end-of-Sprint-10 state sometime before this sprint
  began, which took `.env.local` and every Integration Sprint 1–4 file with it (the Integration
  Phase's prior 4 sprints are being redone from this point). Recreated `.env.local` with
  placeholder (non-real) Supabase values so the dev server can boot and middleware routing can be
  verified — replace with real project credentials before testing anything auth-dependent live.
  Recreated `.claude/launch.json` at `C:\Users\prade\OneDrive\Desktop\Claude Code\.claude\
  launch.json` (the preview tooling's actual root — one level above this repo) using
  `npm --prefix Unipost run dev` so it resolves into this project correctly.
- **No real Razorpay account configured yet (Sprint 8).** Checkout runs through the in-app mock
  modal until `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set — same posture as Sprint 7's OAuth.
  The webhook route (`/api/webhooks/razorpay`) is real, verified code that nothing calls yet in stub
  mode (no registered webhook URL) — consistent with Sprint 5's "no background worker" caveat.
- **No real recurring billing.** In stub mode (no `razorpay_subscription_id`), a paid plan's period
  end auto-renews itself locally (simulated, so test subscriptions stay usable) — real mode instead
  marks the subscription `past_due` if the period lapses without a `subscription.charged` webhook,
  since only Razorpay's real recurring engine can confirm an actual renewal charge happened.
- **No proration on upgrade/downgrade between paid tiers.** Switching plans starts a fresh billing
  period at the new plan's price; mid-cycle credit/debit is out of scope for this sprint.
- **Analytics headline KPI cards (30-day summary) are NOT plan-gated, only the chart history-depth
  selector is** — a deliberate product choice (a rolling "how am I doing" snapshot stays visible on
  every plan; deep historical exploration is the paid differentiator), not an oversight. Worth
  revisiting if that reads as a gap later.
- **No real platform OAuth apps registered yet (Sprint 7).** All 6 providers run through the mock
  consent screen until real `*_CLIENT_ID`/`*_CLIENT_SECRET` pairs are added — see setup step 9. The
  engine (state signing, token exchange, encrypted storage, refresh) is real; only the "browser hop
  to the actual provider" is simulated.
- **No background sync/refresh worker (Sprint 7)**, consistent with Sprint 5's "no background
  publisher" gap. Token refresh only happens when "Sync Now" is clicked or the sync engine is
  invoked some other way — an expired token sits `expired` until the user reconnects or a future
  cron calls `syncAccount` per due connection.
- **Publishing adapters are still stubs** — Sprint 7 only broadened the *interface*
  (`schedule`/`update`/`delete`/`validate`/`preview`), it didn't add real platform implementations.
  Real integrations call `registerPublisher()`; the connect flow above doesn't automatically wire a
  connected account to a live publisher yet — that link (using a connection's stored token when
  actually publishing) is follow-up work for whichever sprint adds the first real platform.
- **Analytics numbers are simulated (Sprint 6).** `lib/growth/simulate.ts` deterministically
  generates followers/reach/engagement per user+platform+day (seeded, stable across refreshes,
  nudged by real publish activity) because there's no live platform API yet — same stopgap as
  Sprint 5's publishing stub. Creator Score's engagement/growth factors and the Analytics page's
  vanity metrics inherit this limitation; Consistency/Frequency/Platform-Activity/AI-Utilization/
  Content-Quality are 100% real. Replace `simulate.ts`'s output with a real ingestion worker later —
  `analytics_daily`'s schema doesn't need to change.
- **"Top performing posts" is an estimate.** No per-post metrics table exists; `lib/growth/
  performance.ts` distributes each day's simulated platform analytics across that day's actually-
  published posts. Honest proxy, not fabricated, but not real per-post data either.
- **`syncGrowth()` runs (and can write) on every visit** to `/analytics`, `/score` or `/coach` —
  all writes are idempotent/no-op after the first application per day, but this means those three
  pages are heavier than a typical dashboard read. Acceptable for now; revisit if it's ever slow.
- **Dashboard home (`/dashboard`) still reads mock data, not the new Sprint 6 growth system** —
  `CreatorScorePreview`/`AnalyticsPreview`/`AITipCard` were deliberately left unwired this sprint
  (out of explicit scope; wiring them means calling `syncGrowth()`, with its write cost, from the
  home page too). Follow-up: rewire those 3 widgets to `syncGrowth()`'s bundle.
- **No background worker yet (Sprint 5).** `scheduled_time` arriving does not auto-publish — there's
  no cron/queue-runner. "Publish now" is a manual action; a real scheduler (Supabase cron / edge
  function / external worker) must call `publishNow`-equivalent logic per due row in a later sprint.
  Missed schedules currently just surface as a "missed" reminder, not an auto-retry.
- **Publishing Service is a stub** (`lib/schedule/publishing.ts`) — deterministic success, no real
  platform calls. Real integrations register a `PlatformPublisher` per platform; no other code
  should need to change.
- ~~Password reset flow not implemented~~ **Resolved in Sprint 9** — `/forgot-password` +
  `/reset-password` shipped (`requestPasswordReset`/`updatePassword`, anti-enumeration generic
  messaging, reuses the existing `/auth/callback?next=` mechanism).
- **`profiles` table + `handle_new_user` trigger pending (Sprint 3).** Users created now live in
  `auth.users` (+ `full_name` in metadata) with no profile row — Sprint 3 must backfill them.
  Role/plan currently read from `app_metadata` (+ `ADMIN_EMAILS` allow-list) until `profiles` lands.
- **Dashboard still uses mock data for most widgets** (`lib/mock/dashboard.ts`) — deliberately
  unwired; Sprint 3+ replaces each value with a real query. **`SubscriptionStatus` was rewired to
  real data in Sprint 8** (it's what that sprint builds); `AnalyticsPreview`/`CreatorScorePreview`/
  `AITipCard`/`TodaySchedule`/`RecentDrafts`/`RecentActivity` are still mock — each has a real data
  source already built (Sprint 5/6) and just needs wiring. Global `AppProviders` (Lenis + cursor)
  now also affects the app; fine for now, revisit if the dashboard wants native scroll.
- **Middleware invariant:** all protected pages MUST live under the `(app)` route group (guarded
  by `(app)/layout.tsx` via `requireUser()`); middleware is the fast-path. Keep future routes there.
- **Edge-runtime warning:** `@supabase/ssr` triggers a `process.version` Edge warning in
  middleware — benign (Supabase's official pattern); revisit if Next changes middleware runtime.
- Global `AppProviders` applies Lenis + custom cursor to *all* routes (incl. app/auth) —
  revisit for real dashboard UX in a later sprint.
- `useCountUp` starts before the SSR reduced-motion value resolves (minor a11y leak).
- Live auth E2E (real OAuth round-trip, email confirm) unverifiable without your keys.
- **No rate-limiting anywhere (confirmed again in Sprint 10).** Auth endpoints (login,
  signup, password-reset request) and the Gemini chat/generation endpoints have no
  request throttling — cost/abuse exposure is bounded by AI-credit balance and Zod
  length caps (Sprint 10) but not by request frequency. Was already flagged as
  "later" since `ARCHITECTURE.md`'s original draft; still the single biggest
  remaining gap between this codebase and "actually launch-ready."
- **RLS write-lockdown pattern (Sprint 9/10's `0008`/`0009` "read-only, writes via
  service-role or a re-checked RPC") has not been applied to `xp_history`,
  `achievements`, `publishing_logs`, `sync_logs`, `integration_events`** — same root
  cause as the billing tables Sprint 10 fixed (blanket own-row CRUD from the 0004–0006
  loop), but lower severity (gamification/operational logs, not paid entitlements) and
  a materially larger blast radius to fix (5 more data-layer files across growth/
  scheduling/integrations, none of which can be live-tested in this environment).
  Recommended as a dedicated follow-up, not bundled into Sprint 10.
- **Next.js is on 14.2.35, not the 16.x line.** `npm audit` still lists several
  advisories (DoS/cache-poisoning/XSS in image optimization, i18n middleware, CSP
  nonces) only fully resolved on Next 16 — none of the affected features are in use
  here (no `remotePatterns`, no i18n routing, no nonce-based CSP), and jumping two
  major versions without live regression-testing capability was judged riskier than
  the residual exposure. Revisit when there's a real staging environment to test
  against.
- **No automated test suite exists** (confirmed in Sprint 10 — no Jest/Vitest/
  Playwright anywhere in the repo or `package.json`). Every sprint's "tested" claim
  has been `tsc`/`next build`/manual preview click-through, consistent with this
  sandbox never having a live Supabase session to run real integration tests against.
  The single highest-leverage post-RC1 investment: at minimum, integration tests for
  the billing write-paths Sprint 10 just touched (`confirmPayment`, `spendCredits`)
  and the RLS policies themselves, given how easy the Sprint 10 finding was to miss
  without one.
- **No OG/social-share image** (Sprint 10) — `next/og`'s `ImageResponse` failed to
  prerender locally (`TypeError: Invalid URL` inside `@vercel/og`'s bundled font
  loader), so `app/opengraph-image.tsx` was removed rather than ship an unverified
  build. `app/icon.svg` (favicon) uses a static file instead and works fine. Retry the
  dynamic OG image in a real deployment environment (Vercel's Linux build servers) —
  it may just be a local Windows/OneDrive-path artifact, same family as the
  `.next` junction workaround.
- **`lib/billing/gates.ts` vs. inline plan-limit checks.** `createSchedules`
  (`lib/db/schedule.ts`) and `completeConnection` (`lib/db/integrations.ts`) each
  reimplement their own count-vs-limit gate instead of calling `gates.ts`'s
  equivalents (which were unused and removed in Sprint 10, except
  `maxAnalyticsRangeDays`, which is real). Not a bug — both inline versions are live,
  tested, and correct — but worth consolidating onto one shared gate function next
  time either call site needs to change.
- **RLS performance pattern is inconsistent across migrations (Sprint 9 finding).** `0008_admin.sql`
  wraps every policy's function call in `(select ...)` (Supabase's documented "evaluate once per
  query, not once per row" pattern) and uses `to authenticated` explicitly; migrations `0001`–`0007`
  use bare `auth.uid()` calls instead. Deliberately **not retrofixed this sprint** — those policies
  are shipped, tested, security-critical code, and touching 7 migrations' worth of RLS without
  dedicated review time is riskier than the perf gap itself at current scale. Worth a dedicated
  sprint/pass later, not a correctness bug today.
- **Admin impersonation is a placeholder.** The brief asked for it "future-ready"; no impersonation
  session-swap exists yet — `UserDetailPanel` has no button for it. Would need a short-lived,
  clearly-audited, admin-can-always-exit session mechanism if built.
- **Admin refunds don't call Razorpay.** `adminRecordRefund` only marks `payments.status='refunded'`
  as internal bookkeeping — per the standing rule against autonomous real-money transfers. A real
  refund still has to be issued in the Razorpay dashboard by a human; this just keeps UniPost's own
  records in sync afterward.
- **Admin AI cost estimates are rough.** `getAiMonitoringSummary`'s "Est. cost this month" uses a
  fixed `CHARS_PER_TOKEN`/`EST_INR_PER_1K_TOKENS` approximation, not Gemini's actual per-call billed
  tokens (which the API responses aren't currently captured for). Labeled as an estimate in the UI;
  swap in real token counts if Gemini's response metadata is captured later.
- **`support_tickets` table exists with RLS but no UI** (Sprint 9, deliberately future-ready per the
  brief) — schema is ready for a user-facing "contact support" form + an admin queue view whenever
  that becomes a priority; zero schema changes needed to wire it up.
- **Admin pages unverified in a live browser session (Sprint 9)**, consistent with every prior
  sprint's constraint in this environment — no authenticated Supabase session exists here to reach
  past the `/admin` role gate. Verified via `tsc --noEmit`, `next build`, and manual cross-checks of
  every client-component-to-server-action call signature instead. Recommend a real click-through
  (login as an admin user, exercise each of the 8 admin pages) before shipping.
- **Admin Users page still has no `profiles` table to join against** (the Sprint 3 gap noted above
  persists) — `listUsers`/`getUserDetail` read display name and everything else directly from the
  Auth Admin API (`user_metadata`) plus per-user queries against `posts`/`subscriptions`/etc. Works
  today; will simplify once `profiles` + `handle_new_user` finally lands.
