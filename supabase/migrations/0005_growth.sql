-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 6 · Creator Intelligence Engine
-- (analytics, creator score, XP, achievements, goals, growth recommendations)
-- Depends on 0001 (public.set_updated_at()).
-- ─────────────────────────────────────────────────────────────

-- ── Analytics (one row per user × platform × day) ──
-- Populated by a simulation service until live platform APIs land (see
-- lib/growth/simulate.ts) — the schema itself is production-shaped so a real
-- ingestion worker can write into it without changing anything downstream.
create table if not exists public.analytics_daily (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  platform        text not null,
  date            date not null,
  followers       integer not null default 0,
  reach           integer not null default 0,
  impressions     integer not null default 0,
  views           integer not null default 0,
  watch_time_min  integer not null default 0,
  profile_visits  integer not null default 0,
  likes           integer not null default 0,
  comments        integer not null default 0,
  shares          integer not null default 0,
  saves           integer not null default 0,
  posts_published integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, platform, date)
);
create index if not exists analytics_daily_user_date_idx on public.analytics_daily (user_id, date);
create index if not exists analytics_daily_platform_idx  on public.analytics_daily (user_id, platform, date);

-- ── Creator Score history (one row per computation, so trend/history work) ──
create table if not exists public.creator_scores (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  score             integer not null check (score between 0 and 100),
  grade             text not null,
  consistency       integer not null check (consistency between 0 and 100),
  frequency         integer not null check (frequency between 0 and 100),
  engagement        integer not null check (engagement between 0 and 100),
  platform_activity integer not null check (platform_activity between 0 and 100),
  growth            integer not null check (growth between 0 and 100),
  ai_utilization    integer not null check (ai_utilization between 0 and 100),
  content_quality   integer not null check (content_quality between 0 and 100),
  computed_at       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists creator_scores_user_idx on public.creator_scores (user_id, computed_at desc);

-- ── XP ledger (append-only; total XP + level are derived, never stored) ──
create table if not exists public.xp_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      integer not null,
  reason      text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists xp_history_user_idx on public.xp_history (user_id, created_at desc);
-- Idempotency for natural-key events (e.g. one "post_published" award per post,
-- one "daily_streak" award per calendar day) — reason + meta->>'key' is unique per user.
create unique index if not exists xp_history_unique_key_idx
  on public.xp_history (user_id, reason, (meta->>'key'))
  where meta ? 'key';

-- ── Achievements (unlocked records; catalog lives in lib/growth/achievements.ts) ──
create table if not exists public.achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (user_id, achievement_id)
);
create index if not exists achievements_user_idx on public.achievements (user_id, unlocked_at desc);

-- ── Goals ──
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  metric      text not null check (metric in ('followers','reach','posts','engagement','revenue')),
  platform    text,
  target      numeric not null check (target > 0),
  current     numeric not null default 0,
  status      text not null default 'active' check (status in ('active','completed','failed','archived')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists goals_user_status_idx on public.goals (user_id, status);

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ── Growth recommendations (the AI Growth Coach's structured feed) ──
create table if not exists public.growth_recommendations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null,
  title         text not null,
  description   text not null,
  action_label  text,
  action_href   text,
  severity      text not null default 'info' check (severity in ('info','success','warning','danger')),
  source        text not null default 'rule' check (source in ('rule','ai')),
  status        text not null default 'active' check (status in ('active','dismissed','completed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists growth_recs_user_status_idx on public.growth_recommendations (user_id, status, created_at desc);
-- One active recommendation per (user, kind) — refreshing re-uses/updates the existing row.
create unique index if not exists growth_recs_active_kind_idx
  on public.growth_recommendations (user_id, kind)
  where status = 'active';

drop trigger if exists growth_recs_set_updated_at on public.growth_recommendations;
create trigger growth_recs_set_updated_at before update on public.growth_recommendations
  for each row execute function public.set_updated_at();

-- ── Row Level Security (own-row on every table) ──
alter table public.analytics_daily        enable row level security;
alter table public.creator_scores         enable row level security;
alter table public.xp_history             enable row level security;
alter table public.achievements           enable row level security;
alter table public.goals                  enable row level security;
alter table public.growth_recommendations enable row level security;

do $$
declare t text;
begin
  foreach t in array array['analytics_daily','creator_scores','xp_history','achievements','goals','growth_recommendations'] loop
    execute format('drop policy if exists %I_select_own on public.%I;', t, t);
    execute format('create policy %I_select_own on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
    execute format('create policy %I_insert_own on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists %I_update_own on public.%I;', t, t);
    execute format('create policy %I_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
    execute format('create policy %I_delete_own on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;
