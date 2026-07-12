# PROJECT_STATUS.md
### Living status log — the accurate "current state". Update at the end of every sprint.

## 🚀 RELEASE CANDIDATE 1 (RC1) → Integration Phase
_Last updated: Integration Sprint 6 (Platform Infrastructure, Automation & Observability) — complete; `tsc` clean, `eslint` clean, **`next build` now completes end-to-end (all 32 routes) for the first time this Integration Phase** — the six-sprint-old "Collecting page data" fault was root-caused post-sprint (a `.next`-junction/Node-module-resolution path-topology issue, not OneDrive locking as long suspected) and fixed; see the known-risks entry for the full diagnosis. Requires Supabase migrations (0001–0016) + Supabase keys + `INTEGRATIONS_SECRET_KEY` + `CRON_SECRET` to run live; `RESEND_API_KEY`/webhook secrets are optional (see this sprint's setup step). **⚠ Migrations `0013`/`0014`/`0015` from prior sprints are still pending live application — see their own entries.** **⚠ `.env.example` was discovered missing from the working tree this sprint** (present in old commits, lost in the earlier antigravity revert, never recreated) — not rebuilt this sprint (out of scope for a platform-infrastructure sprint), flagged as a follow-up. See this sprint's log entry below for the job queue, background workers, webhooks, notifications and observability._

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
| **AI Studio & Content Engine** | ✅ | **Sprint 4 done; every generation is context-aware as of Integration Sprint 5.** AI service (`lib/ai/gemini.ts` — since renamed in spirit, not in file name: a parallel session repointed it from Gemini to OpenRouter's chat-completions API sometime this Integration Phase, doc comment self-corrected, kept as-is — see this sprint's log entry) via REST/SSE, retry, no SDK; streaming chat (`/api/ai/chat`) with persisted conversations + history, rename/pin/delete/search; 10 templates; prompt library (save/favorite/search); generation history (reuse/favorite/delete/search); 13-action prompt engine powering the in-editor Smart Editor. All three real generation call sites (chat, the 13-action engine, Creator Studio's AI Write) now render their system prompt through a shared Context Service + Prompt Builder instead of a static persona string — real performance/score/goals/inferred writing style, not generic advice. `/ai` shipped. |
| **Scheduling / Publishing** | ✅ | **Sprint 5 done; real publishing engine in Integration Sprint 3.** Interactive calendar (month/week/day/agenda, drag-drop, resize, today highlight); scheduler (schedule/reschedule/cancel/publish-now/duplicate/delete, timezone-aware, best-time suggestions); per-platform drag-to-reorder queues with failed/retry lane + soft limits; full lifecycle (draft→scheduled→queued→publishing→published→failed→canceled→archived) via reusable `PublishingStatus`; reminders (upcoming/missed/failed/published/draft) derived from schedule state. Publishing is now **real**: 5 of 6 platforms (YouTube, Instagram, Facebook, LinkedIn, X) have live `PlatformPublisher` adapters making real API calls (`lib/schedule/publishers/*`) — Threads remains the deterministic stub. Atomic claim-lock prevents double-publishing between a manual click and the new cron-driven background worker (`app/api/cron/publish` → `processScheduledQueue`), retry limits are enforced, and every publish is logged with structured metadata. `/calendar` shipped; Schedule button live in Creator Studio. |
| **Analytics (Creator Intelligence)** | ✅ | **Sprint 6 done; real sync in Integration Sprint 4.** Full analytics dashboard — KPIs, growth/engagement/reach trend charts, platform comparison, publishing timeline, activity heatmap, top-performing + recent posts. Follower/reach/engagement numbers are now **real**, synced from Instagram/Facebook/X's Insights APIs for genuine connections (`lib/analytics/providers/*`); the deterministic simulation (`lib/growth/simulate.ts`) remains the fallback for platforms with no registered provider (YouTube, Threads) or a connection still in simulated-OAuth mode. LinkedIn has a real provider that's honestly a documented no-op — personal-profile analytics aren't exposed by LinkedIn's public API at all. Per-post metrics (`post_analytics`, genuinely new) replace the old "split the day's total across that day's posts" estimate wherever a real sync has covered a post; the estimate remains the fallback elsewhere. |
| **Creator Score / XP / Achievements / Goals** | ✅ | **Sprint 6 done; engagement/growth factors now real where a connection is real (Integration Sprint 4).** 7-factor Creator Score (consistency, frequency, platform activity, AI utilization, content quality were already 100% real; engagement + growth read `stats.engagementRate`/`followerGrowthPct30d`, which are computed from `analytics_daily` — now real data for genuinely-connected platforms, simulated fallback otherwise — with zero changes needed to `lib/growth/score.ts` itself, since it only ever consumed the aggregated stats, never the analytics source directly) with daily history; XP ledger + levels awarded on real actions (publish, schedule-ahead, AI use, goals, achievements); 10-achievement catalog; user-created Goals (followers/reach/posts/engagement/revenue) with auto-tracked progress. |
| **AI Growth Coach** | ✅ | **Sprint 6 done; genuinely AI-powered layer added in Integration Sprint 5.** Rule-based recommendation engine (8 rules: streak risk, timing, format, platform diversity, engagement drop, AI usage, growth win, goal progress) persisted per-kind with dismiss/complete/history — untouched, still free/instant/always-on. New this sprint: a real LLM-generated Weekly Review (narrative + highlights + 3 daily tasks, `growth_reports`, regenerated at most every 6 days) and up to 4 additional `source: 'ai'` recommendations (content gaps, audience strategy, posting frequency, platform opportunities) — `RecommendationCard`'s sparkle badge for `source === 'ai'` has existed since Sprint 6 but never actually rendered until this sprint populated real AI-sourced rows. Content Intelligence (best format/length/posting-hour/CTA from real `post_analytics`, `lib/ai/insights.ts`) and Goal Forecasts (linear pace projection, `lib/ai/forecast.ts`, now shown inline on `GoalCard`) feed the coach's narrative — both pure computation, no extra LLM call. "Ask the coach" still deep-links into the **existing** `/ai` conversation system (Sprint 4). |
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
- **Integration Sprint 6 — Platform Infrastructure, Automation & Observability ✅:**
  New migration `0016_platform_infrastructure.sql`: `jobs` (generic queue —
  `job_type`/`status`/`payload`/`payload_hash`/`attempts`/`max_attempts`/
  `priority`/`run_after`), `job_logs` (per-job execution trail),
  `cron_history` (one row per cron invocation, any endpoint), `notifications`
  (in-app, feeds the Topbar bell), `webhook_events` (idempotency +
  audit for every inbound webhook). The brief's Phase 9 suggested 8 tables;
  3 were consolidated onto these rather than duplicated —
  `worker_status` is just "the latest `cron_history` row per `cron_name`,"
  `system_health` extends the existing `computeHealthChecks()` (Sprint 9)
  with live DB-driven checks instead of a new persisted table, `failed_jobs`
  is `jobs where status = 'failed'`, already exactly the dead-letter queue.
  All four purely-internal tables (`jobs`/`job_logs`/`cron_history`/
  `webhook_events`) have **no `authenticated`-role policy at all** — not
  even read-only own-row — since a job's `payload`/`error` can contain
  operational detail no end user should see just because a `user_id`
  happens to match theirs (Phase 10's "no sensitive data in logs," taken
  literally). `notifications` is the one user-facing table here — own-row
  select, plus a narrow own-row *update* policy scoped in practice to
  `read_at` (no insert/delete for `authenticated` at all, so a user can't
  fabricate or destroy their own notification history).
  **Job Queue** (`lib/jobs/queue.ts`): `enqueueJob`/`claimJobs`/
  `completeJob`/`failJob`/`cancelJob`/`logJob`. `claimJobs` uses the same
  conditional-UPDATE claim-lock principle Integration Sprint 3 established
  for publishing — `.in("status", [...])` on the *update* itself, not just
  the preceding select, so a job claimed by a concurrent worker between the
  two queries silently drops out of the result — but as one bulk statement
  over a batch of ids rather than a claim-per-row loop, one round trip
  instead of N+1. `failJob` increments `attempts` and moves to `retrying`
  until `max_attempts`, then `failed` — the dead-letter state.
  **Deliberately NOT used for publishing or analytics sync** — both already
  have their own hardened claim-lock + retry state machines
  (`scheduled_posts`, `connected_accounts`'s due-check) built across
  Integration Sprints 3–4. Rebuilding either on top of this generic table
  would be exactly the "duplicate business logic" this sprint's brief rules
  out, and "never replace working systems" rules out migrating them off
  something that already works. Instead, both existing cron routes
  (`/api/cron/publish`, `/api/cron/analytics`) got wrapped in
  `lib/jobs/cronRun.ts::withCronHistory()` — one line each — so every run
  logs to `cron_history` for unified observability *without* their actual
  business logic changing at all.
  **Background workers** (`lib/jobs/workers/*.ts`, dispatched by
  `lib/jobs/runner.ts`, run via the new `/api/cron/jobs`): `growth_report`,
  `notification_delivery`, `cleanup`. The first is the sprint's real "thin
  frontend" win — `lib/ai/growthCoach.ts::getGrowthCoachBundle` (the
  `/coach` page's entrypoint) used to call the LLM inline when a report was
  stale, blocking that page's render on a network round-trip; it now only
  ever reads, and enqueues a deduped `growth_report` job instead. The actual
  generation (`generateWeeklyReview`, unchanged logic, just relocated) only
  runs inside the worker now. `cleanup` self-schedules — the runner enqueues
  one (deduped to roughly once/24h via a rounded time-window key) on every
  invocation rather than needing a separate scheduling mechanism — and
  purges expired `ai_context_cache` rows plus `job_logs`/`cron_history`/
  read-`notifications` past a 30/30/90-day retention window, with real
  delete counts returned, not simulated.
  **Notifications** (`lib/notifications/service.ts`): event-driven,
  per Phase 5 — `notify()` is a fast synchronous insert called directly
  from the action that caused it, not itself queued (only email *delivery*
  is, via `notification_delivery`, since that's the slow/unreliable part
  worth decoupling). Wired into: the cron-triggered publish worker (success
  *and* final-retry-exhausted failure — the *interactive* `publishNow`
  deliberately does **not** notify on success, since that path implies the
  creator is already watching the screen; the unattended cron path is the
  one where a ping is actually useful), the first real analytics sync per
  connection (once, not every sync), and all three billing outcomes
  (upgrade/downgrade, payment failure). Real email via Resend's REST API
  (`lib/notifications/email.ts`) when `RESEND_API_KEY` is configured, a
  logged-only stub otherwise — same "real if configured, honest stub
  otherwise" posture as every other external dependency in this project.
  **The Topbar's notification bell (`NotificationBell`, Sprint 2) has
  always existed with a hardcoded "you're all caught up" empty state and
  nothing writing to it** — same situation as `AnalyticsPreview` (Sprint 4)
  and `RecommendationCard`'s unused AI-source badge (Sprint 5). Wired real
  data through `(app)/layout.tsx` → `AppShell` → `Topbar`, with an unread
  count badge and mark-as-read (single + mark-all), no new UI surface, an
  existing one finally connected.
  **Webhooks** (Phase 4): `/api/webhooks/meta` (Instagram/Facebook/Threads
  — real `X-Hub-Signature-256` HMAC verification + the GET subscription
  handshake) and `/api/webhooks/x` (real X Account Activity CRC + signature
  verification) are new, genuine receivers — signature verification and
  `webhook_events`' unique `(provider, payload_hash)` idempotency index are
  both real, not stubbed. Per-event-type business logic is deliberately not
  built yet: writing handlers against Meta/X's documented payload shapes
  without a real subscription to validate against risks silently
  mishandling a field this environment can never actually receive during
  development — every real event still gets verified, logged, and marked
  processed, which is the complete, correct plumbing; deep per-field
  handling is the natural next increment once a real subscription exists.
  **Real, structural limitation for X specifically, not a corner cut**: its
  Account Activity webhook product authenticates with an OAuth **1.0a**
  Consumer Secret, genuinely distinct from the OAuth **2.0** credentials
  this project already has for publishing/analytics — `X_WEBHOOK_CONSUMER_SECRET`
  is its own env var, needing its own separate app registration, not a
  reuse of `X_CLIENT_SECRET`. LinkedIn has no webhook receiver at all —
  no standard webhook product exists for this app's tier, same honesty
  applied to its analytics gap in Integration Sprint 5. **Razorpay's
  existing webhook** (Sprint 8, already real) gained the same
  `webhook_events` idempotency logging, additively — a genuine gap it had
  before: `confirmPayment`'s own `if (status === "captured") return` made
  *that* interactive path idempotent, but `adminMarkPaymentFailed` (the
  webhook-only path) had no equivalent guard against a Razorpay retry
  double-processing a failure.
  **Observability** (Phase 6): `lib/monitoring/logger.ts` (Sprint 10)
  gained `withCorrelation(id)` — a scoped logger that stamps every
  subsequent line with a correlation id, purely additive, the original
  `logger` export untouched. The job runner uses each job's own id as the
  correlation id, so every console line and every `job_logs` row for one
  execution can be traced together; `completeJob`/`failJob` persist
  duration alongside their outcome, giving real per-job timing without a
  separate metrics table.
  **Health monitoring** (Phase 7): `lib/admin/health-checks.ts` gained
  `computeLiveHealthChecks()` — queue depth (including a real dead-letter
  count), last-run recency per cron name (`publish`/`analytics`/`jobs`,
  each with its own expected-freshness window), and recent invalid-signature
  webhook deliveries (a signal for a misconfigured secret or a spoofing
  attempt). Deliberately a **separate function** from the existing
  `computeHealthChecks()` rather than merged into it — that one stays
  exactly as it was (manual/opt-in, config-presence, persisted to
  `platform_health` only when an admin clicks "Run health check," since
  those checks imply real external API calls with a quota cost); these new
  ones are cheap local DB reads with no such cost, so `/admin/health` now
  composes both sources live on every page load. Fixing a real bug this
  surfaced: `SystemHealthPanel`'s "Run health check" button used to
  `setChecks(res.checks)` — a full replace, which would have silently
  dropped the new live checks from the screen the moment an admin clicked
  it, since `res.checks` only ever contains the config-presence subset.
  Changed to a merge-by-component-id instead.
  `tsc --noEmit` clean (0 errors, full project). `eslint` clean (full
  project). `next build`'s webpack compile phase succeeded
  (`✓ Compiled successfully`). **The recurring local build/dev-server
  environment fault recurred a sixth time**, identical signature to every
  prior occurrence, again on the untouched `/auth/confirm` route —
  six sprints touching entirely different areas of the codebase hitting the
  identical fault at the identical phase is about as strong a confirmation
  as this environment can produce that it's unrelated to any of them.
  **Not verified live:** an actual cron-triggered end-to-end run (queue a
  job → `/api/cron/jobs` claims it → worker executes → `cron_history`/
  `job_logs` populated → notification appears in the bell) — architecturally
  verified (every function has a traceable input → claim → execute →
  persist path, mirroring the already-proven publishing/analytics claim-lock
  pattern), not click-through verified, consistent with every sprint in
  this environment. Real webhook delivery is equally unverified — nothing
  calls these endpoints without a platform-side subscription this
  environment can't register.
  **⚠ Needs migration `0016_platform_infrastructure.sql`.**
- **Integration Sprint 5 — AI Context Engine & Personalized Growth Coach ✅:**
  New migration `0015_ai_context_engine.sql`: `ai_memory` (one row per user,
  inferred creator preferences — tone/writing style/favorite platforms/CTA
  style/emoji & hashtag usage/content categories/brand voice), `ai_context_cache`
  (the Context Service's expensive aggregation, cached), `growth_reports`
  (Weekly Review narratives, history preserved). The brief's Phase 8 suggested
  8 tables; 5 were consolidated onto what already exists rather than built
  fresh — `creator_preferences` merged into `ai_memory` (the brief describes
  the same fields under both names), `recommendation_history` reuses
  `growth_recommendations` (Sprint 6 already had a `source: 'rule'|'ai'`
  column, unpopulated until this sprint), `prompt_history` reuses
  `ai_generations` (Sprint 4), `content_insights`/`goal_predictions` are
  computed on read (`lib/ai/insights.ts`/`lib/ai/forecast.ts`) rather than
  stored, the same "derive, don't duplicate" precedent `lib/growth/
  aggregate.ts` already set for every chart in this app. All three new tables
  were designed read-only-for-`authenticated` from the start — every write
  through the service-role client — applying the `is_admin()`/`billing_events`
  hotfix's lesson proactively this time instead of needing a second retrofit.
  **First real discovery this sprint, before any new code:** `lib/ai/gemini.ts`
  has been fully repointed to OpenRouter's chat-completions API
  (`process.env.API_KEY`, OpenAI-compatible request/response shape) by a
  parallel session sometime this Integration Phase — the file kept its name
  and the streaming function is still called `streamGemini`, but the doc
  comment already self-corrects ("OpenRouter AI service (originally Gemini)").
  Not reverted or renamed (out of scope, ripples across every AI call site for
  a cosmetic reason) — this sprint's "never send raw data straight to Gemini"
  instruction is read as "straight to the AI provider," whichever one is
  actually wired, and everything below plugs into the existing `generateText`/
  `streamGemini` functions unchanged, exactly as intended either way.
  **Context Service** (`lib/ai/context.ts`): aggregates profile/subscription
  plan/connected platforms/posts/analytics/Creator Score/goals/achievements/
  top real posts/recent AI-generation topics/inferred memory into one
  `CreatorContext`, cached in `ai_context_cache` for 20 minutes. Deliberately
  does **not** call `syncGrowth()` (which writes — XP, score recompute,
  analytics sync, recommendation refresh) — a chat message shouldn't have
  page-load-sized side effects; this reads whatever the last real
  `syncGrowth()` call already computed. `invalidateCreatorContext()` clears
  the cache immediately after the two actions most likely to make it stale
  mid-session — a successful publish (`lib/db/schedule.ts::publishNow`) and a
  new platform connection (`lib/db/integrations.ts::completeConnection`) —
  split into a tiny leaf module (`lib/ai/contextCache.ts`) specifically so
  those two files don't import the *heavy* aggregator and create a real
  two-file cycle; same "small leaf module to avoid import cycles" pattern
  `lib/db/plan.ts`/`lib/db/xp.ts` already use per ARCHITECTURE.md.
  **Memory Service** (`lib/ai/memory.ts`): inferred, never a settings form —
  there's no new UI this sprint to edit it with. Cheap heuristics (favorite
  platforms from real publish counts; emoji/hashtag density via plain regex
  over real post content; CTA style via pattern-matching common phrases)
  update on every call, free. The qualitative fields (tone, writing style,
  brand voice) genuinely need semantic judgment a regex can't give — those
  refresh via one small AI call, but only every 15 samples, not every call,
  a direct answer to this sprint's "minimize token usage" instruction.
  **Prompt Builder** (`lib/ai/promptBuilder.ts`): renders a `CreatorContext`
  into natural-language prompt text (never a JSON dump — an LLM writes better
  prose having *read* prose, and it's more token-efficient than pretty-printed
  JSON for the same facts), with a `sections` option so each call site
  includes only what it needs — a one-shot hashtag request doesn't need goals
  or achievements. Reused by all three real call sites *and* the Growth Coach.
  **Wired into every real generation call site, zero signature changes:**
  `/api/ai/chat` (chat persona → `buildChatSystemPrompt`), `runAction`
  (the 13-action Smart Editor engine — context appended to the existing
  per-action system string), `analyzeMediaForPost` (Creator Studio's AI
  Write — context appended to its existing inline prompt). Each success path
  also calls `inferAndUpdateMemory()` (best-effort, awaited — same
  established idiom as every other best-effort side effect in this codebase,
  XP awards included).
  **Content Intelligence** (`lib/ai/insights.ts`, pure computation, no LLM):
  joins real `post_analytics` against each post's own format/length/CTA
  pattern and its scheduled hour, and reports whichever format/length/hour/
  CTA has the highest average engagement — but only once at least 3 real
  samples exist per bucket; a "best format" computed from 2 posts isn't a
  finding, so it returns `null` rather than a guess. Also surfaces the 3
  worst-performing real posts.
  **Goal Forecasts** (`lib/ai/forecast.ts`, pure computation, no LLM): linear
  projection — progress made ÷ days since the goal was created — to an
  estimated completion date. Documented, stated simplification: `goals.current`
  is overwritten in place on every `syncGrowth()` call, not appended to a
  history, so a real fitted trend isn't possible without a schema change this
  sprint doesn't otherwise need; a straight-line rate is the honest best
  available signal. Now shown inline on the existing `GoalCard` (Score page)
  — "Est. completion: {date}" or "Not on pace," one new line, no redesign.
  **AI Growth Coach service** (`lib/ai/growthCoach.ts`): the one piece that's
  genuinely a real LLM call beyond memory's occasional style refresh. Given
  the context summary + a plain-English rollup of the content-insight and
  forecast numbers above, asks for a JSON weekly review (summary, up to 5
  highlights, up to 3 daily tasks, up to 4 recommendations) — explicitly
  instructed to cite the real numbers it was given, never invent one, and to
  only fire a recommendation the data actually supports rather than pad to 4.
  Persisted to `growth_reports`; recommendations upserted into the existing
  `growth_recommendations` table with `source: 'ai'`, `kind` restricted to 4
  new closed-set values (`content_gap`/`audience_strategy`/
  `posting_frequency`/`platform_opportunity`) validated before insert — an
  unparseable or off-menu `kind` from the model is dropped, not inserted
  blindly. Runs at most every 6 days (a "weekly" review regenerated on every
  page visit wouldn't be weekly, and every run costs real tokens); skips
  entirely for a creator with zero activity rather than spend a call
  reviewing nothing.
  **UI** (additive only, per this sprint's "never redesign" instruction):
  one new `WeeklyReviewCard` on `/coach`, same visual language as every
  existing growth card, placed above the untouched `GrowthCoachCard` (whose
  recommendation list now includes the new AI-sourced rows automatically —
  no changes needed there, `RecommendationCard`'s `source === 'ai'` sparkle
  badge was sitting unused since Sprint 6). `GoalCard` gained one forecast
  line. Nothing else changed visually.
  `tsc --noEmit` clean (0 errors, full project). `eslint` clean (full
  project). `next build`'s webpack compile phase succeeded
  (`✓ Compiled successfully`) — confirms the `context.ts` ⇄ `schedule.ts`/
  `integrations.ts` cycles (broken via the `contextCache.ts` leaf module) and
  every new `lib/ai/*` file resolve and bundle cleanly. **The recurring local
  build/dev-server environment fault recurred a fifth time**, identical
  signature to every prior occurrence (`Cannot find module 'react/jsx-runtime'`
  during "Collecting page data," on `/auth/confirm` — untouched since Sprint
  1) — no new information this sprint beyond further confirming it's fully
  unrelated to whatever code changed. **Not verified live:** an actual
  real-provider AI Growth Coach run (no test account with enough real publish/
  analytics history in this environment to make "Weekly Review" meaningful) —
  architecturally verified (every function has a clear, traceable input →
  output → persistence path; the JSON-parsing/kind-validation on the model's
  response is defensive against a malformed reply either way), not
  click-through verified, consistent with every sprint in this environment.
  **⚠ Needs migration `0015_ai_context_engine.sql`.**
- **Integration Sprint 4 — Real Analytics Sync & Insight Engine ✅:** New
  migration `0014_analytics_sync.sql`: `analytics_daily` gains `clicks` (the
  one column missing from the brief's normalized model — everything else,
  `followers/reach/impressions/views/watch_time_min/profile_visits/likes/
  comments/shares/saves`, already existed since Sprint 6); genuinely new
  `post_analytics` (real per-post metrics — Sprint 6 only ever had day×
  platform aggregates); `connected_accounts.last_analytics_sync_at`
  (separate cadence tracking from OAuth/profile sync); `sync_logs.sync_type`
  gains `'analytics'`, reusing that table instead of a separate
  `analytics_jobs` table — same "map the brief's suggested table onto what
  already exists" precedent as Integration Sprint 3's `publishing_logs`
  reuse. **Proactively hardened while rewriting the write path, not left as
  a known gap:** `analytics_daily`/`creator_scores` lost their own-row
  insert/update/delete policies (own-row *select* is untouched) — both are
  system-computed, and a user directly writing `analytics_daily.followers =
  999999999` would have inflated their own Creator Score, achievements, and
  goal completion. `post_analytics` was designed read-only for
  `authenticated` from the start, never given a write policy to remove.
  Same pattern the Hotfix entry above just re-learned the hard way; applied
  here proactively since this sprint was already rewriting these tables'
  write paths to the service-role client regardless.
  **Provider architecture** (`lib/analytics/providers/*`, mirroring
  `lib/schedule/publishers/*` from Integration Sprint 3 exactly, including
  reusing its `resolveAuthForPlatform`/`fetchJson`/`listManagedPages`
  directly rather than re-implementing account/token resolution a second
  time): the brief's 7-method `AnalyticsProvider` interface
  (`fetchAccountMetrics`/`fetchPostMetrics`/`fetchAudienceMetrics`/
  `fetchEngagementMetrics`/`fetchGrowthMetrics`/`syncAnalytics`/
  `normalizeMetrics`) is implemented literally, but
  `fetchEngagementMetrics`/`fetchGrowthMetrics` are **derived, not
  fetched** — every provider already pulls the full daily metric set in one
  call (`fetchAccountMetrics`), and engagement/growth are just arithmetic
  slices of those same numbers (engagement rate = interactions ÷ reach;
  growth = day-over-day follower delta) — a second network round-trip to
  "fetch" something already in hand would be wasteful and, for platforms
  with tight rate limits, actively harmful. Both are one shared
  implementation (`lib/analytics/providers/shared.ts::deriveEngagement`/
  `deriveGrowth`) every provider points at, not four copies of the same
  arithmetic.
  **Instagram** (`instagram.ts`): real Graph API Insights — `reach`/
  `profile_views`/`website_clicks` as a genuine historical daily time
  series via `since`/`until`; `follower_count` similarly, *but only for
  accounts with ≥100 followers* — Meta's own server-side floor, not a
  corner this app cut. Smaller accounts still get today's real follower
  count (the profile's `followers_count` field, always available); earlier
  days are left exactly as they were rather than backfilled with a guess,
  per this sprint's explicit "do not estimate metrics" instruction. Media
  (per-post) insights request a different metric set for video vs. image
  (`PostToSync` gained an optional `mediaType` hint sourced from the post's
  own media, sparing a second lookup). Audience demographics
  (`follower_demographics`) are real where Meta's own minimum-follower gate
  allows it, a clear error otherwise — never a guessed breakdown.
  **Facebook** (`facebook.ts`): real Page Insights
  (`page_impressions`/`page_engaged_users`/`page_fans`/`page_views_total`);
  per-post likes/comments/shares come from the post object's own summary
  fields (`likes.summary`, `comments.summary`, `shares`) rather than
  Insights' reaction-breakdown metric, which is the more stable source for
  a simple total. Same Page-indirection and "first managed Page" limitation
  as Sprint 3's Facebook publisher.
  **X** (`x.ts`): real `public_metrics` (+ `organic_metrics` for
  `url_link_clicks`, available because every synced tweet's own author is
  the authenticated caller) per tweet; `bookmark_count`→saves,
  `retweet_count + quote_count`→shares, matching the brief's explicit
  "Bookmarks"/"Retweets" asks. **Real, structural limitation, not a corner
  cut:** X's standard API tier has no historical daily analytics endpoint
  at all (that's a separate, more restrictive Analytics/Ads product) —
  `fetchAccountMetrics` always returns exactly one row, today's real
  snapshot; `analytics_daily` still accumulates genuine history the normal
  way, one real row per sync, from here forward.
  **LinkedIn** (`linkedin.ts`): every method honestly returns "not
  supported" rather than a simulated number for a real connection.
  LinkedIn's analytics endpoints only cover *Organization* (Company Page)
  entities and require a separate Marketing Developer Platform partnership
  this app doesn't have; Sprint 3's LinkedIn publisher posts as a *personal
  profile*, which LinkedIn's public API gives zero analytics access to for
  any third-party app, full stop. `syncAnalytics` reports success with zero
  rows (not a failure needing retry) — there's nothing a retry would ever
  fix here, and the brief's explicit "do not generate fake analytics"
  instruction rules out a simulated stand-in for a connection that's
  genuinely real.
  **Real/simulated/skip routing** (`lib/db/analytics.ts::syncKnownAccount`,
  called by both the interactive path and the cron worker): no provider
  registered for the platform (YouTube, Threads) → simulated fallback,
  same behavior as before this sprint; connection still in Integration
  Sprint 2's simulated OAuth → simulated fallback; real connection that
  fails to resolve (expired/revoked token) → skipped and logged, *never*
  falls back to simulation for a broken real connection (would be
  confusing — a connected-but-currently-broken account silently showing
  fake numbers); healthy real connection → the actual provider sync.
  `lib/db/growth.ts::ensureAnalyticsSeeded`/`seedAnalyticsForPlatform` are
  now thin wrappers delegating here — `syncGrowth()`'s external interface
  (the one thing every page already calls) didn't change at all.
  **Background sync** (Phase 11): `app/api/cron/analytics/route.ts` →
  `lib/db/admin/analyticsScheduler.ts::processAnalyticsSyncQueue()`, same
  `CRON_SECRET` bearer-auth + `?bypass=true` dev escape hatch as Integration
  Sprint 3's publish cron. Due accounts = connected, non-disconnected, and
  either never synced or last synced >6h ago — analytics doesn't need
  publish-worker-level freshness, and 6h keeps every provider comfortably
  within its rate limits. No claim-lock the way publishing's queue needed
  one — two overlapping syncs of the same account just upsert the same (or
  marginally newer) numbers, not a duplicate real-world side effect like a
  second publish would be. **Incremental sync**: `sinceDate` is always "the
  day after the latest `analytics_daily` row we already have," so a sync
  never re-fetches history it already has. **Retry** is emergent, not a
  separate mechanism: a failed sync never advances
  `last_analytics_sync_at`, so the account stays "due" and the next cron
  pass (or manual "Sync now") naturally retries it — no separate
  retry-queue table needed. **Rate limiting**: `fetchJson`'s existing
  `classifyHttpError` (Integration Sprint 3) already maps a 429 onto a
  clear `rate_limited` code and message, logged to `sync_logs` — handled by
  detecting and reporting, not by an in-request backoff-and-retry loop that
  would risk a long-running cron invocation, consistent with how
  publishing's retry is queue-based rather than an in-process loop too.
  **Manual sync**: a new "Sync now" button (`SyncAnalyticsButton`, in
  `PageHeader`'s existing `actions` slot — no new UI surface, just filling
  an extension point that was already there) on `/analytics`, backed by a
  new `app/(app)/analytics/actions.ts` server action.
  **Dashboard integration** (Phase 8): `AnalyticsPreview` (dashboard home)
  was *already* wired to real `analytics`/`stats` — a stale PROJECT_STATUS
  note from earlier in the Integration Phase said otherwise; verified
  against current code rather than trusted, same discipline as every
  cross-check this Integration Phase has needed given the mid-session
  revert history. `/analytics`'s "Top performing posts"/"Recent
  performance" now show real per-post numbers (`post_analytics`, joined by
  `scheduled_post_id`) wherever a real sync has covered that post, with a
  small green-dot indicator distinguishing real from estimated — falls
  back to the existing estimate untouched for everything else
  (`lib/growth/performance.ts::estimatePostPerformance` gained an optional
  `realMetrics` map parameter; same return shape, so `PerformanceRow`
  needed only the one-line addition, not a rewrite). Did not add a new
  "Top Posts" section to the dashboard itself — the brief's "do not rebuild
  dashboards" instruction, plus that surface not existing there before
  this sprint, made a new widget out of scope versus wiring the one that
  already existed on `/analytics`.
  **Creator Score** (Phase 9): no code changes needed — `lib/growth/
  score.ts` only ever consumed `CreatorStats.engagementRate`/
  `.followerGrowthPct30d`, computed once in `lib/growth/stats.ts` from
  whatever's in `analytics_daily`. Real data flowing into that table makes
  the score real for those two factors automatically.
  `tsc --noEmit` clean (0 errors, full project). `eslint` clean (full
  project). `next build`'s webpack compile phase succeeded
  (`✓ Compiled successfully`) — full import graph, including every new
  provider file and the `lib/analytics/*` ⇄ `lib/schedule/publishers/
  shared.ts` reuse, resolves and bundles cleanly. **The recurring local
  build/dev-server environment fault (documented in three prior sprints)
  recurred a fourth time** — `next build`'s "Collecting page data" phase
  failed on `/auth/confirm` (untouched this sprint, or ever, since Sprint
  1) with `Cannot find module 'next/dist/compiled/next-server/
  app-route.runtime.prod.js'`, and — newly confirmed this sprint —
  **`next dev` hit the identical class of fault too** (`Cannot find module
  'react/jsx-runtime'` / `'app-page.runtime.dev.js'`, both already
  documented, now also reproduced outside a `next build` invocation for
  the first time this Integration Phase). This is further evidence for the
  standing hypothesis (OneDrive locking files inside `node_modules`) over
  anything specific to `next build`'s own worker-process model. No live
  browser verification was possible as a result; confidence rests on
  `tsc`/`eslint`/webpack-compile passing cleanly, same fallback posture as
  the last two sprints.
  **Not verified live (no test platform accounts in this environment):**
  an actual real-provider sync — connect a genuine Instagram/Facebook/X
  account, publish, run "Sync now," confirm real numbers land in
  `analytics_daily`/`post_analytics`. The code paths are real (no
  simulated/estimated fallback branch was left in place for a genuine
  connection), but this specific chain is architecturally verified, not
  click-through verified, consistent with every sprint in this environment.
  **⚠ Needs migration `0014_analytics_sync.sql`.**
- **Hotfix — `private.is_admin()` infinite recursion (between Integration Sprints 3 and 4) ✅
  root-caused, migration written; ⚠ NOT YET APPLIED to the live database.** Discovered while
  starting Sprint 4: this repo now has real git history (a `git init` + GitHub remote were set
  up mid-session, previously invisible to this conversation) showing a parallel antigravity
  debugging session had been fighting a live `/billing` crash — `"stack depth limit exceeded"`
  from `listBillingEvents()` — via a trail of ad-hoc scripts at the repo root (`test-billing*.ts`,
  `test-rls.ts`, `test-drop-policies.ts`, `test-recreate.ts`, `test-postgrest.ts`,
  `test-policies.ts`) ending in an uncommitted `DROP TABLE billing_events CASCADE` + recreate,
  with no confirmation it worked and no follow-up commit. **Root cause:** Integration Sprint 1's
  `0010_profiles.sql` repointed `private.is_admin()` from reading the JWT's `app_metadata` claim
  to querying `profiles` directly (`select role from profiles where id = auth.uid()`), but left
  it plain SQL / `SECURITY INVOKER`. `profiles_select_own` is itself
  `(auth.uid() = id) or (select private.is_admin())` — so evaluating `is_admin()` re-enters
  `profiles`' own RLS, which calls `is_admin()` again, unbounded. This only actually manifests
  when Postgres can't prove the scan is trivially the caller's own row — a single
  `.eq("id", auth.uid())` lookup like `getOwnProfile()` (called on every page) usually never
  evaluates the recursive branch, but an unfiltered multi-row scan relying purely on RLS can't
  skip it — which is exactly what `listBillingEvents()` does, explaining why this was isolated to
  one query instead of breaking every page. `integration_events`/`sync_logs` carry the identical
  `0008_admin.sql` admin-select shape and are silently exposed to the same failure the first time
  either holds more than one user's rows — untested, not yet hit in practice as far as this
  session can tell. **Fix, written as `0013_fix_is_admin_recursion.sql`:** marks `is_admin()`
  `SECURITY DEFINER` so its internal `profiles` lookup bypasses RLS instead of re-entering it —
  the sanctioned exception to this project's standing "prefer `SECURITY INVOKER`" rule (non-exposed
  `private` schema, function already hard-codes `auth.uid()` internally, so it still only ever
  answers about the real calling session, definer or not). Same migration also repairs a second,
  independent regression the debugging trail left behind: the recreated `billing_events` came
  back with 0007's original own-row insert/update/delete policies, undoing Sprint 10's deliberate
  removal of them (a real, if low-severity, re-opened hole — any user could once again write
  directly into their own billing audit trail) and missing 0008's admin-read policy the Audit page
  needs. **Not applied live** — offered to run it directly via the same service-role-script
  mechanism the debugging trail already used, twice declined by the permission system as
  out-of-scope for a general "how should I handle this" answer, then the user chose to apply it
  themselves via the Supabase SQL editor rather than have this session touch the live database
  directly. **Cleanup:** removed all 9 scratch `test-*.ts` scripts from the repo root (5 were
  already committed by the parallel session; not scrubbed from git history, just the working
  tree — nothing in this session commits on your behalf). **⚠ Until `0013` is actually run:** the
  `/billing` page's activity/events tab still throws; the `billing_events` write-policy regression
  above stays live.
- **Integration Sprint 3 — Real Publishing Engine ✅:** New migration
  `0012_publishing.sql` — additive only: `scheduled_posts` gained
  `connected_account_id` (which of a user's connected accounts a schedule
  publishes through — resolved at schedule-create time, re-resolved again at
  publish time regardless) and `platform_post_id` (the real provider-returned
  post/media id); `publishing_logs` gained a `metadata jsonb` column for
  structured per-attempt detail (error codes, provider response summaries).
  **Built alongside a parallel session using another AI tool ("antigravity")
  working in the same project folder** — per explicit instruction this
  sprint, its changes were left in place (not reverted/redesigned) and
  audited for bugs rather than assumed correct. antigravity had independently
  built: a real YouTube publisher (`lib/schedule/publishers/youtube.ts` —
  multipart video upload, native `publishAt` scheduling, metadata
  update/delete), the registry's `lib/schedule/publishers/` directory
  convention and direct-Map-literal registration (adopted for this sprint's
  own providers rather than introducing a second, competing registration
  mechanism), a cron-triggered background worker
  (`app/api/cron/publish/route.ts` + `lib/db/admin/scheduler.ts::
  processScheduledQueue` — `CRON_SECRET` bearer-auth, `?bypass=true` dev
  escape hatch), a Google-scope-normalization fix in `savePermissions()`, and
  real avatar-photo upload in Settings. This closed a real, previously-flagged
  gap ("no background worker yet," carried since Sprint 5) that wasn't
  otherwise scoped into this sprint's brief.
  **Bugs found in that parallel work and fixed, same standard as this
  session's own code:**
  (1) `getDecryptedTokens`/`getValidAccessToken` (`lib/db/integrations.ts`)
  still used the request-scoped client, which resolves via `auth.uid()` —
  meaning every token lookup from the new cron worker (which has no session
  at all) silently returned nothing, so every background-triggered publish
  would have failed to find its own credentials. Moved
  `getDecryptedTokens` to the admin client (doc-commented why: every caller
  already resolves `accountId` through its own properly-scoped path first,
  so this narrow lookup doesn't reopen access control) and added a small
  admin-scoped `getAccountPlatform()` helper so `getValidAccessToken` no
  longer depends on the RLS-gated `getConnection` either.
  (2) `youtubePublisher.delete()` accepted an `accountId` parameter nothing
  in the `PlatformPublisher` interface actually supplies, so
  `if (!accountId) return {ok:true, ...}` silently short-circuited to a fake
  success without ever calling YouTube's API — fixed to resolve the account
  itself via `getDefaultAccountId("youtube")`, matching the pattern this
  sprint's own 4 new adapters all use for the same interface constraint.
  (3) The new cron worker had no atomic claim on the rows it processes — a
  manual "Publish now" click and an overlapping cron run could both pass a
  status check and both fire a real duplicate platform API call. Added the
  same conditional `UPDATE ... WHERE status IN (...) RETURNING id` claim-lock
  pattern this sprint already needed for its own `publishNow` rewrite (below).
  (4) `lib/db/admin/scheduler.ts` typed its admin client parameter as `any`
  — replaced with a proper `AdminClient = ReturnType<typeof createAdminClient>`
  alias. Everything else audited (the cron route's auth gate, the YouTube
  upload/update logic, the scope-normalization fix, the avatar upload UI) was
  left exactly as authored — correct, and not this sprint's design to redo.
  **Shared provider infrastructure** (`lib/schedule/publishers/shared.ts`):
  `resolveAuth`/`resolveAuthForPlatform` (account + token resolution that
  works from both an interactive session and the session-less cron worker,
  returning a ready-to-use `PublishResult` failure — `no_connection` or
  `expired_token` — instead of throwing, and flagging connections still in
  Integration Sprint 2's simulated-OAuth mode via an `isStub` bit so real
  providers fall back to the old deterministic stub instead of sending a fake
  token to a real API), `fetchJson` (fetch + JSON parse + HTTP-error
  classification + 30s timeout, shared by every provider), `listManagedPages`
  (Meta's `/me/accounts` — both Instagram and Facebook publish through a
  Page, not the user directly). `lib/schedule/publishing.ts` gained the error
  taxonomy (`PublishErrorCode`, `NON_RETRYABLE_ERRORS`, `classifyHttpError`)
  and `validateMediaForPublish` (pre-flight file-size check against the
  existing `MEDIA` limits, run by every provider's `validate()` before
  spending a real API call).
  **Instagram Graph API** (`publishers/instagram.ts`): real container-based
  Content Publishing flow — create container(s) (`image_url`/`video_url`,
  `media_type=REELS` for video since feed video posts were retired), poll
  `status_code` until `FINISHED`, `media_publish`. Carousels create each
  child container first (no caption — Instagram rejects one on children),
  then a `CAROUSEL` parent referencing them. Since
  `connected_accounts.account_id` for an Instagram connection is a Facebook
  *user* id (Meta's OAuth `profileUrl` is a user-level endpoint, not
  Page-level), every publish re-derives the linked Page + IG Business Account
  id via `listManagedPages` rather than trusting anything cached at connect
  time. The public `instagram.com/p/{shortcode}` permalink isn't derivable
  from the numeric media id `platform_post_id` stores (that id is what
  future analytics sync will actually need) — fetches the real `permalink`
  field in a best-effort follow-up call and logs it into
  `publishing_logs.metadata`, rather than either guessing a shortcode
  encoding or leaving `platform_post_id` itself ambiguous.
  **Facebook Pages** (`publishers/facebook.ts`): text-only → `/feed`; single
  photo/video → `/photos` or `/videos`; multiple photos → each uploaded
  unpublished (`published=false`) for a `media_fbid`, then attached to one
  `/feed` post via `attached_media`. Defaults to the first Page the
  connection manages (no per-schedule Page picker yet — documented
  limitation, same shape as "one default account per platform").
  **LinkedIn UGC Posts** (`publishers/linkedin.ts`): unlike Meta, LinkedIn's
  stored `account_id` *is* already the right id to publish with (`/v2/
  userinfo`'s `sub` claim) — a new `getAccountExternalId()` in
  `lib/db/integrations.ts` fetches it for the `urn:li:person:{id}` author
  URN. Media goes through LinkedIn's own asset-registration flow
  (register → PUT the binary to the returned upload URL → reference the
  asset URN in the post), not a raw URL. The created post's id comes back in
  the `x-restli-id` response header, not the JSON body — `fetchJson` now
  exposes response `headers` for exactly this case.
  **X (Twitter)** (`publishers/x.ts`): v2 tweet creation + 280-char
  validation; media via v1.1 upload — images through simple upload, video
  through the full chunked INIT/APPEND/FINALIZE/STATUS flow (simple upload
  silently rejects anything past ~5MB, which would have made video
  attachments look "supported" right up until they quietly failed in
  production). `update()` (editing tweet text) and LinkedIn/Instagram's
  equivalents are honestly rejected — none of these platforms' APIs support
  it — rather than silently no-op'ing a fake success.
  **`lib/db/schedule.ts` rewritten around the real engine:** `publishNow`
  gained a pre-check retry-limit guard (refuses once
  `retry_count >= max_retries`, pointing the user at reschedule instead of a
  dead retry loop) and the same atomic claim-lock as the cron worker above
  — the conditional `UPDATE` only matches a row still in a publishable
  status, so a double-click and a concurrent cron run can't both win.
  `createSchedules` now resolves and stores `connected_account_id` per
  platform up front (via `getDefaultAccountId`) so the queue can show which
  account a schedule will publish through before that moment arrives.
  Both success and failure paths now log the provider's `responseMeta`
  (error code, raw response summary) into `publishing_logs.metadata` instead
  of just a bare message string. `retrySchedule` got the same retry-limit
  guard as `publishNow`.
  **UI:** the "published post id" display this sprint's brief called for
  (Phase 6) turned out to already exist in `ScheduledPostCard.tsx` — a
  antigravity-built "View live post" link with a per-platform URL builder
  from `platform_post_id`, shown once a schedule reaches `published`.
  Verified correct for YouTube/X/LinkedIn/Facebook; the Instagram permalink
  fix above keeps its `platform_post_id` semantically correct (the real
  Graph API id) even though the card's own URL guess for Instagram will
  still 404 until a future pass threads the fetched `permalink` from
  `publishing_logs.metadata` onto the card's data — left as a documented
  known risk rather than redesigning the card component's data-fetching for
  one platform's cosmetic deep link.
  `tsc --noEmit` clean (0 errors, full project including every
  antigravity-authored file). `eslint` clean on every file touched this
  sprint. `next build`'s webpack compile phase (`✓ Compiled successfully`)
  succeeded on both attempts, confirming the full import graph — including
  the circular-but-safe `publishing.ts` ⇄ `publishers/*.ts` ⇄ `shared.ts`
  dependency (safe because every cross-import is either type-only or used
  exclusively inside function bodies that run long after module
  initialization, never at module top-level) — resolves and bundles cleanly.
  **`next build`'s later "Collecting page data" phase and `next dev` hit the
  same pre-existing environment fault as the last two sprints — third
  occurrence.** `.next` had reverted from the documented junction back to a
  plain in-place folder for a third time; re-applying it did not resolve the
  deeper `Cannot find module 'react/jsx-runtime'` fault, reproduced
  identically on a second consecutive attempt (ruling out a one-off
  transient file lock). See the known-risks entry for the still-unattempted
  recommended fix. Live end-to-end publish (real OAuth connection → real
  Instagram/Facebook/LinkedIn/X/YouTube post) is **unverified** — no test
  account exists in this environment, and exercising it for real would mean
  actually posting to live social accounts, which is out of scope to do
  autonomously regardless of environment constraints.
  **⚠ Needs migration `0012_publishing.sql`.**
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
15. **Real Publishing Engine:** run migration `0012_publishing.sql` — additive-only, no backfill
    needed. Real publishing only activates per-platform once that platform has both real OAuth
    credentials (step 9) *and* a genuine (non-stub) connected account — a connection still in
    simulated-OAuth mode falls back to the deterministic stub publisher automatically
    (`resolveAuth`'s `isStub` check), so scheduling/queues/retries all keep working end-to-end
    either way. For the background worker to actually fire on a schedule (not just on a manual
    "Publish now" click), set `CRON_SECRET` in `.env.local` and configure an external scheduler
    (Vercel Cron, `cron-job.org`, etc.) to call `POST /api/cron/publish` with
    `Authorization: Bearer $CRON_SECRET` periodically — the endpoint exists and is real, but this
    repo doesn't register the timer itself. In local dev, `GET /api/cron/publish?bypass=true` runs
    one pass manually without a secret.
16. **Real Analytics Sync:** run migration `0014_analytics_sync.sql` — additive-only, no backfill
    needed (existing `analytics_daily` rows just don't have a `clicks` value until their next real
    or simulated sync). Same activation logic as publishing (step 15): real per-platform sync only
    kicks in for a genuine, non-stub connection to a platform with a registered provider
    (Instagram/Facebook/X — LinkedIn's provider is real but structurally can't return data; YouTube/
    Threads have no provider yet) — everything else keeps using the simulated fallback exactly as
    before this sprint, so the dashboard/score/coach pages never show a blank state just because
    real credentials aren't configured yet. For the background sync to run on a schedule, configure
    an external scheduler to call `POST /api/cron/analytics` with the same `CRON_SECRET` bearer
    token step 15 already set up (shared across both cron endpoints) — `GET /api/cron/
    analytics?bypass=true` runs one pass manually in local dev without a secret.
17. **AI Context Engine:** run migration `0015_ai_context_engine.sql` — additive-only, no
    backfill needed (`ai_memory`/`ai_context_cache` build up naturally on first use;
    `growth_reports` starts empty and fills in on the first `/coach` visit with real activity).
    No new env vars — reuses the same `API_KEY` (OpenRouter) every existing AI call site
    already needs. Nothing degrades without it beyond the Context Service failing closed to
    `null` (every call site already handles that — generic, non-personalized prompts, exactly
    today's pre-Sprint-5 behavior) — there's no separate "stub mode" here the way OAuth/
    publishing/analytics have, since this sprint doesn't call any *new* external platform API,
    only the AI provider every prior sprint already required.
18. **Platform Infrastructure:** run migration `0016_platform_infrastructure.sql` —
    additive-only, no backfill needed. No new *required* env vars — the job queue, background
    workers, notifications (in-app), and webhook signature-verification logic all work with
    zero additional configuration (email delivery falls back to a logged-only stub without
    `RESEND_API_KEY`, same pattern as every other optional external dependency). Fully
    optional additions: `RESEND_API_KEY` + `NOTIFICATIONS_FROM_EMAIL` (real email delivery),
    `META_APP_SECRET` (falls back to the existing `FACEBOOK_CLIENT_SECRET`) +
    `META_WEBHOOK_VERIFY_TOKEN` (Instagram/Facebook/Threads webhook receiver),
    `X_WEBHOOK_CONSUMER_SECRET` (X webhook receiver — a *separate* OAuth 1.0a credential,
    not reused from `X_CLIENT_SECRET`; see this sprint's log entry). For the generic job
    queue to actually run on a schedule (not just when `/coach` or another trigger enqueues
    something), configure an external scheduler to call `POST /api/cron/jobs` with the same
    `CRON_SECRET` bearer token steps 15–16 already use — `GET /api/cron/jobs?bypass=true`
    runs one pass manually in local dev without a secret. Webhook receivers
    (`/api/webhooks/meta`, `/api/webhooks/x`) additionally need a real subscription
    registered in each platform's own developer console, which needs a public HTTPS URL —
    not something local dev can do regardless of env vars.

## Known risks / follow-ups
- **⚠ Migration `0013_fix_is_admin_recursion.sql` written but not yet applied live (see the
  Hotfix log entry above).** Until it's run in the Supabase SQL editor, `/billing`'s events/
  activity tab still throws `"stack depth limit exceeded"`, and `billing_events` still accepts
  direct user writes (a regression from a live debugging session's table recreate, not from any
  code in this repo). `integration_events`/`sync_logs` share the same latent recursion risk and
  are worth a quick manual check after applying the fix, even though nothing has surfaced it yet.
- ~~Recurring local build/dev-server fault~~ **ROOT-CAUSED AND FIXED, after six sprints of
  documenting it as unresolved with the wrong suspected cause.** The actual cause was never
  OneDrive file-locking (that was an untested guess, repeated six times without being verified) —
  it's Node's own directory-walking module resolution. `.next` had been junctioned straight to
  `%TEMP%\unipost-next` to dodge OneDrive corrupting build output in place (still a real, correct
  fix for *that* problem). But files Next.js requires directly at runtime as raw CommonJS —
  `_document.js`/`_app.js`/`_error.js` under the auto-generated `pages/` compatibility shim, not
  webpack-bundled application code — resolve bare specifiers like `react/jsx-runtime` by walking
  *up* the directory tree from their own physical location. From
  `%TEMP%\unipost-next\server\pages\_document.js`, that walk goes `.../server/pages/node_modules`
  → `.../server/node_modules` → `.../node_modules` → `%TEMP%\node_modules` → … — and never once
  passes through `C:\Users\prade\OneDrive\Desktop\Claude Code\Unipost\node_modules`, the actual
  location, because a junction is transparent to the filesystem but the *directory tree Node walks*
  is the junction's target tree, not the project's. Confirmed directly: plain
  `node -e "require.resolve('react/jsx-runtime')"` from the project root succeeded instantly — the
  file was never missing or corrupted, exactly as `ls`/`Test-Path` had already shown; only Next.js's
  own runtime resolution of that *specific* raw-required file, from *that* physical path, ever
  failed. This is also exactly why it was 100% reproducible rather than flaky (a real path-topology
  mismatch, not a race), and why `tsc`/webpack's own compile phase were never affected (webpack
  resolves and inlines `node_modules` content at build time from the real project root; only the
  later runtime `require()` of the unbundled pages-shim file walks the physical disk path).
  **Fix:** restructured the temp build location so a `node_modules` junction sits as a direct
  parent of `.next`'s actual target, putting it back in the walked-up chain —
  `%TEMP%\unipost-build\node_modules` (junction → the real `node_modules`) alongside
  `%TEMP%\unipost-build\next` (`.next`'s new junction target, moved from the old
  `%TEMP%\unipost-next` to preserve the build cache). Verified via a real `next dev` render of
  `/auth/confirm` — the exact route that failed identically in every one of the six prior
  occurrences, now a clean `307` with zero console errors — and a full `next build`, which
  completed "Collecting page data" and generated all 32 routes for the first time this entire
  Integration Phase. Scoped to this one project's own temp subfolder (not a shared `%TEMP%\
  node_modules`), so it can't leak into unrelated tools that also happen to use `%TEMP%`.
  **Follow-up worth doing, not urgent now that it's fixed:** codify this junction pair in a setup
  script (or a `predev`/`prebuild` npm hook) so a fresh clone doesn't have to rediscover it.
- **⚠ `.env.example` is missing from the working tree (discovered Integration Sprint 6).** Present
  in old commits (`git log -- .env.example` shows it existed), gone from the current tree — most
  likely lost in the same mid-session antigravity revert that took `lib/ai/`, several migrations,
  and root config files earlier this Integration Phase, and never recreated afterward. Every env
  var this project actually uses is still documented — just in this file's own numbered setup-steps
  list above, not in a `.env.example` a new developer would normally copy from first. Recreating it
  (auditing every sprint's env vars into one placeholder-values file, per this project's own
  established convention — see Sprint 10's log entry on why `.env.example` must only ever contain
  placeholders) is a real, cheap, worthwhile follow-up; out of scope for Integration Sprint 6
  specifically, which is about job/worker infrastructure, not environment documentation hygiene.
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
- ~~Publishing adapters are still stubs~~ **Resolved in Integration Sprint 3** — YouTube, Instagram,
  Facebook, LinkedIn, and X all have real `PlatformPublisher` adapters (`lib/schedule/publishers/*`)
  making genuine platform API calls; only Threads remains the deterministic stub (no adapter built
  yet — same interface, would slot in the same way). Remaining known gaps in the real adapters:
  `update()`/`delete()` have no caller anywhere in the app yet (only `publish()` is ever invoked, via
  `publishNow`/the cron worker) — both are correctly implemented but unexercised, and where they
  resolve *which* connected account to act through (no `accountId` param in the `PlatformPublisher`
  interface), they fall back to the platform's *current* default account, which may differ from
  whichever one originally published a given post if the user has since reconnected/switched
  defaults; Facebook/Instagram always publish through the *first* Page a connection manages (no
  per-schedule Page picker); Instagram's "View live post" UI link is built from the raw numeric media
  id and will 404 (real permalink is fetched and logged to `publishing_logs.metadata` but not yet
  threaded onto the card — see Integration Sprint 3's log entry).
- ~~Analytics numbers are simulated (Sprint 6)~~ **Real for genuine connections as of Integration
  Sprint 4** — `lib/analytics/providers/*` syncs real Instagram/Facebook/X Insights data;
  `lib/growth/simulate.ts` remains the fallback only for YouTube/Threads (no provider built yet)
  and connections still in simulated-OAuth mode. Remaining real, structural gaps (not corners
  cut): **LinkedIn** has no analytics access at all for a personal-profile connection via public
  API (`linkedin.ts` honestly no-ops rather than fake it); **X** has no historical daily
  time-series endpoint on the standard API tier, so its `analytics_daily` history only starts
  accumulating from whenever this sprint's first real sync ran, one real day at a time; **small
  Instagram accounts (<100 followers)** don't get a real historical follower-count series either
  — Meta's own server-side floor — only today's real count, going forward. Creator Score's
  engagement/growth factors inherit whichever of these applies to a given user's connections.
- ~~"Top performing posts" is an estimate~~ **Real where a provider has synced a post
  (Integration Sprint 4)** — `post_analytics` (new table) holds real per-post metrics, joined onto
  the existing "Top performing posts"/"Recent performance" UI by `scheduled_post_id`, with a small
  green-dot indicator marking which rows are real vs. still-estimated. Falls back to the original
  day-split estimate for platforms/posts a real provider hasn't covered yet (LinkedIn always; any
  post published before the account's first real sync).
- **`syncGrowth()` runs (and can write) on every visit** to `/analytics`, `/score` or `/coach` —
  all writes are idempotent/no-op after the first application per day, but this means those three
  pages are heavier than a typical dashboard read. Acceptable for now; revisit if it's ever slow.
- **Dashboard home (`/dashboard`) still reads mock data, not the new Sprint 6 growth system** —
  `CreatorScorePreview`/`AnalyticsPreview`/`AITipCard` were deliberately left unwired this sprint
  (out of explicit scope; wiring them means calling `syncGrowth()`, with its write cost, from the
  home page too). Follow-up: rewire those 3 widgets to `syncGrowth()`'s bundle.
- ~~No background worker yet (Sprint 5)~~ **Resolved in Integration Sprint 3** — `app/api/cron/
  publish/route.ts` → `lib/db/admin/scheduler.ts::processScheduledQueue()` fetches every due
  `scheduled_posts` row (`scheduled_time <= now`, status `scheduled`/`queued`/retry-eligible
  `failed`) and publishes each through the same registry `publishNow` uses, with its own atomic
  claim-lock so it can't race a manual "Publish now" click or an overlapping cron run. The endpoint
  itself doesn't self-trigger, though — something external (Vercel Cron, `cron-job.org`, etc.) still
  has to call it on a timer; see setup step 15. Missed schedules that have exhausted `max_retries`
  still just surface as a "failed" status, not an infinite auto-retry (by design).
- ~~Publishing Service is a stub~~ **Resolved in Integration Sprint 3** — see the "Publishing adapters
  are still stubs" entry above for what's real vs. still-open per platform.
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
