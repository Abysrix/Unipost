-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 4 · Real Analytics Sync & Insight Engine
-- Depends on 0005 (analytics_daily/creator_scores), 0006 (connected_accounts/
-- sync_logs), 0012 (scheduled_posts.platform_post_id).
-- ─────────────────────────────────────────────────────────────

-- ── analytics_daily: add `clicks` (website/link clicks — Instagram/LinkedIn
-- expose this; every other column in the brief's normalized model already
-- exists on this table, so this is the only real gap). ──
alter table public.analytics_daily
  add column if not exists clicks integer not null default 0;

-- ── Per-post metrics (genuinely new — Sprint 6 only ever had day×platform
-- aggregates, never a real per-post row; "Top Posts" was an estimate
-- distributing daily analytics across that day's published posts). One row
-- per scheduled_post that's been published somewhere real; re-synced in
-- place (not append-only) since a post's metrics change over time and we
-- only ever want its current snapshot, not a growing history per post —
-- analytics_daily is where the time series lives. ──
create table if not exists public.post_analytics (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  scheduled_post_id  uuid not null references public.scheduled_posts (id) on delete cascade,
  platform           text not null,
  platform_post_id   text not null,
  impressions        integer not null default 0,
  reach              integer not null default 0,
  likes              integer not null default 0,
  comments           integer not null default 0,
  shares             integer not null default 0,
  saves              integer not null default 0,
  views              integer not null default 0,
  clicks             integer not null default 0,
  engagement_rate    numeric not null default 0,
  -- Full provider response for anything the normalized columns above don't
  -- capture (platform-specific breakdowns, demographics where available) —
  -- debugging + future-proofing, same idea as publishing_logs.metadata.
  raw                jsonb not null default '{}'::jsonb,
  synced_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (scheduled_post_id)
);
create index if not exists post_analytics_user_idx on public.post_analytics (user_id, synced_at desc);
create index if not exists post_analytics_platform_post_idx on public.post_analytics (platform, platform_post_id);

drop trigger if exists post_analytics_set_updated_at on public.post_analytics;
create trigger post_analytics_set_updated_at before update on public.post_analytics
  for each row execute function public.set_updated_at();

-- ── connected_accounts: track analytics sync cadence separately from OAuth/
-- profile sync (last_sync_at, from 0006) — the two run on different
-- schedules (profile sync is manual/rare; analytics sync is the new
-- recurring background job below). ──
alter table public.connected_accounts
  add column if not exists last_analytics_sync_at timestamptz;

-- ── sync_logs: add 'analytics' as a sync_type, reusing the existing table
-- (same account/user/status/message shape already fits) instead of a
-- separate analytics_jobs table — same "map the brief's suggested table
-- onto what already exists" precedent as Integration Sprint 3's
-- publishing_logs.metadata / connected_account_id additions. ──
alter table public.sync_logs drop constraint if exists sync_logs_sync_type_check;
alter table public.sync_logs add constraint sync_logs_sync_type_check
  check (sync_type in ('manual','auto','token_refresh','profile','health_check','analytics'));

-- ── Row Level Security ──
alter table public.post_analytics enable row level security;

drop policy if exists post_analytics_select_own on public.post_analytics;
create policy post_analytics_select_own on public.post_analytics for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for `authenticated` — post_analytics is
-- entirely system-computed (real provider sync results), same reasoning as
-- billing_events/subscriptions (0009_security_hardening.sql): a blanket
-- own-row write policy would let a user fabricate their own engagement
-- numbers directly, which Creator Score / achievements / goals then trust.
-- Writes only via the service-role client (lib/db/analytics.ts).

-- ── analytics_daily / creator_scores: same system-computed-table lockdown,
-- applied now while their write path is being rewritten anyway (this
-- sprint moves both to the service-role client) rather than left as a
-- known gap the way xp_history/achievements still are (see
-- PROJECT_STATUS.md's known-risks list — genuinely out of this sprint's
-- scope, since nothing here touches their write paths). Read access
-- (_select_own, from 0005) is untouched. ──
do $$
declare t text;
begin
  foreach t in array array['analytics_daily','creator_scores'] loop
    execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
    execute format('drop policy if exists %I_update_own on public.%I;', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
  end loop;
end $$;
