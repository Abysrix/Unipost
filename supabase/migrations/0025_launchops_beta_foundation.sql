-- ─────────────────────────────────────────────────────────────
-- UniPost · LaunchOps Phase 1 · Private beta foundation
--
-- Additive schema for: private beta invites/waitlist/referrals (Phase 8),
-- feature-flag rollout% + per-user overrides (Phase 7), product analytics
-- events (Phase 9), ToS/consent acceptance tracking (Phase 6), and support
-- ticket categorization (Phase 5). No existing table's data or behavior
-- changes — every statement either creates a new table or adds a nullable/
-- defaulted column to an existing one.
-- ─────────────────────────────────────────────────────────────

-- ── Beta invites — one table serves both admin-issued invites and each
-- user's own personal referral link (structurally the same thing: a code,
-- an owner, a use limit, optional expiry). `source` distinguishes them;
-- `created_by = null` means "issued by the system" (e.g. a waitlist
-- conversion), not "no owner". ──
create table if not exists public.beta_invites (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  source           text not null default 'admin' check (source in ('admin', 'referral', 'waitlist')),
  email            text, -- optional: pre-assigned to one specific email address
  created_by       uuid references auth.users (id) on delete set null,
  max_uses         integer not null default 1 check (max_uses > 0),
  use_count        integer not null default 0,
  expires_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists beta_invites_created_by_idx on public.beta_invites (created_by);
create index if not exists beta_invites_code_idx on public.beta_invites (code);

-- One row per redemption (not just a counter on beta_invites) so referral
-- tracking can answer "who did user X actually bring in", not just "how
-- many invites has X used up".
create table if not exists public.beta_invite_redemptions (
  id            uuid primary key default gen_random_uuid(),
  invite_id     uuid not null references public.beta_invites (id) on delete cascade,
  redeemed_by   uuid not null unique references auth.users (id) on delete cascade,
  redeemed_at   timestamptz not null default now()
);
create index if not exists beta_invite_redemptions_invite_idx on public.beta_invite_redemptions (invite_id);

create table if not exists public.beta_waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  referred_by   uuid references auth.users (id) on delete set null,
  status        text not null default 'waiting' check (status in ('waiting', 'invited', 'converted', 'declined')),
  invite_id     uuid references public.beta_invites (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists beta_waitlist_status_idx on public.beta_waitlist (status, created_at desc);

drop trigger if exists beta_waitlist_set_updated_at on public.beta_waitlist;
create trigger beta_waitlist_set_updated_at before update on public.beta_waitlist
  for each row execute function public.set_updated_at();

-- ── Feature flags — rollout percentage + non-boolean config (e.g. a seat
-- limit number) on the existing table; per-user overrides in a new table
-- (a flag can be globally off but force-on for a specific beta tester, or
-- vice versa for a kill switch on one problem account). ──
alter table public.feature_flags add column if not exists rollout_percentage integer not null default 100 check (rollout_percentage between 0 and 100);
alter table public.feature_flags add column if not exists config jsonb not null default '{}'::jsonb;

create table if not exists public.feature_flag_overrides (
  flag_key    text not null references public.feature_flags (key) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  enabled     boolean not null,
  created_at  timestamptz not null default now(),
  primary key (flag_key, user_id)
);

insert into public.feature_flags (key, name, description, category, enabled, config)
values ('beta_seat_limit', 'Beta seat limit', 'Maximum number of accounts the private beta will accept. Signups beyond this go to the waitlist.', 'beta', true, '{"limit": 50}'::jsonb)
on conflict (key) do nothing;

-- ── Product analytics — internal funnel/usage events, distinct from the
-- creator-facing analytics (post_analytics/analytics_daily) this app
-- already has. user_id nullable since some events happen pre-auth. ──
create table if not exists public.product_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  event_name    text not null,
  properties    jsonb not null default '{}'::jsonb,
  session_id    text,
  created_at    timestamptz not null default now()
);
create index if not exists product_events_name_idx on public.product_events (event_name, created_at desc);
create index if not exists product_events_user_idx on public.product_events (user_id, created_at desc);

-- ── Legal consent tracking (Phase 6) ──
alter table public.profiles add column if not exists tos_accepted_at timestamptz;
alter table public.profiles add column if not exists tos_version text;

-- ── Support ticket categorization (Phase 5) — Contact Support/Report Bug/
-- Feature Request all funnel into the existing support_tickets table,
-- distinguished by category instead of three separate tables. ──
alter table public.support_tickets add column if not exists category text not null default 'question' check (category in ('bug', 'feature_request', 'question', 'billing', 'other'));

-- ── Onboarding progress (Phase 2) — one row per user, tracks which guided
-- step they're on so the flow can resume where they left off. ──
create table if not exists public.onboarding_progress (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  current_step  text not null default 'welcome',
  completed_steps text[] not null default '{}',
  skipped       boolean not null default false,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now()
);

drop trigger if exists onboarding_progress_set_updated_at on public.onboarding_progress;
create trigger onboarding_progress_set_updated_at before update on public.onboarding_progress
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──
alter table public.beta_invites             enable row level security;
alter table public.beta_invite_redemptions  enable row level security;
alter table public.beta_waitlist            enable row level security;
alter table public.feature_flag_overrides   enable row level security;
alter table public.product_events           enable row level security;
alter table public.onboarding_progress      enable row level security;

-- beta_invites: a user can read an invite by matching it against their own
-- redemption or their own referral code ownership; admins see all. No
-- direct authenticated write path — issuing/redeeming goes through
-- app-level Server Actions on the service-role client (same "system-
-- computed, write via admin client" pattern as billing/xp/everything else
-- in this schema), so a user can't fabricate a redemption or bump their
-- own use_count.
drop policy if exists beta_invites_select on public.beta_invites;
create policy beta_invites_select on public.beta_invites for select
  to authenticated using ((select auth.uid()) = created_by or (select private.is_admin()));

drop policy if exists beta_invite_redemptions_select on public.beta_invite_redemptions;
create policy beta_invite_redemptions_select on public.beta_invite_redemptions for select
  to authenticated using ((select auth.uid()) = redeemed_by or (select private.is_admin()));

drop policy if exists beta_waitlist_admin_select on public.beta_waitlist;
create policy beta_waitlist_admin_select on public.beta_waitlist for select
  to authenticated using ((select private.is_admin()));

-- feature_flag_overrides: a user can read their own overrides (so the
-- client can know a flag is force-enabled for them); only admins write.
drop policy if exists feature_flag_overrides_select_own on public.feature_flag_overrides;
create policy feature_flag_overrides_select_own on public.feature_flag_overrides for select
  to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));

-- product_events: system-computed telemetry, not user-editable; admin-only
-- read (own-row read isn't useful here and would leak funnel-analysis
-- structure for no product reason). All writes are service-role.
drop policy if exists product_events_admin_select on public.product_events;
create policy product_events_admin_select on public.product_events for select
  to authenticated using ((select private.is_admin()));

-- onboarding_progress: own-row read AND write — this one genuinely is
-- driven by the user's own client-side progress through the wizard (skip/
-- resume), unlike the system-computed tables above.
drop policy if exists onboarding_progress_select_own on public.onboarding_progress;
create policy onboarding_progress_select_own on public.onboarding_progress for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists onboarding_progress_insert_own on public.onboarding_progress;
create policy onboarding_progress_insert_own on public.onboarding_progress for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists onboarding_progress_update_own on public.onboarding_progress;
create policy onboarding_progress_update_own on public.onboarding_progress for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
