-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 5 · AI Context Engine & Personalized Growth Coach
-- Depends on 0003 (ai_generations/ai_conversations), 0005 (growth_recommendations,
-- which already had a `source: 'rule'|'ai'` column — this sprint is the first to
-- actually populate 'ai' rows).
--
-- The brief's Phase 8 suggested 8 tables (ai_memory, creator_preferences,
-- ai_context_cache, growth_reports, recommendation_history, prompt_history,
-- content_insights, goal_predictions). Three are genuinely new schema; the
-- other five are consolidated onto what already exists, same "map the
-- brief's suggested tables onto what's already there" precedent as every
-- prior Integration Sprint:
--   - creator_preferences  → merged into ai_memory (the brief describes the
--     same preference fields under both names — a separate table would just
--     be the same row split in two for no reason).
--   - recommendation_history → growth_recommendations (Sprint 6) already IS
--     a timestamped, status-tracked history with a `source` column built
--     for exactly this ('rule' vs 'ai') — a second history table would
--     duplicate it.
--   - prompt_history → ai_generations (Sprint 4) already stores every
--     action/input/output/duration — the same thing under a different name.
--   - content_insights / goal_predictions → computed on read
--     (lib/ai/insights.ts, lib/ai/forecast.ts), not stored — pure functions
--     over posts/post_analytics/analytics_daily/goals, the same "derive,
--     don't duplicate" pattern lib/growth/aggregate.ts already uses for
--     every other chart in this app. Nothing here is expensive enough to
--     need its own persisted table on top of ai_context_cache below.
-- ─────────────────────────────────────────────────────────────

-- ── Inferred creator memory — one row per user, updated opportunistically
-- after AI actions (never user-edited via a form; there's no new UI this
-- sprint to edit it with, per "never redesign UI"). `sample_count` lets a
-- caller judge confidence — a value inferred from 2 posts is a guess, from
-- 50 is a real pattern. ──
create table if not exists public.ai_memory (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  preferred_tone      text,
  writing_style       text,
  favorite_platforms  text[] not null default '{}',
  cta_style           text,
  emoji_usage         text,
  hashtag_style       text,
  content_categories  text[] not null default '{}',
  brand_voice         text,
  sample_count        integer not null default 0,
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ── Aggregated AI context cache — the Context Service's expensive
-- multi-table aggregation, cached so every chat message / AI action doesn't
-- re-run it. `context_version` lets the Context Service invalidate old
-- shapes after a schema change without a migration. ──
create table if not exists public.ai_context_cache (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  context_version  integer not null default 1,
  context          jsonb not null,
  computed_at      timestamptz not null default now(),
  expires_at       timestamptz not null
);

-- ── Weekly Growth Coach reviews — narrative summaries, history preserved
-- (one row per user per period) so past weeks stay browsable. ──
create table if not exists public.growth_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  summary       text not null,
  highlights    jsonb not null default '[]'::jsonb,
  daily_tasks   jsonb not null default '[]'::jsonb,
  generated_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (user_id, period_start)
);
create index if not exists growth_reports_user_idx on public.growth_reports (user_id, period_start desc);

-- ── Row Level Security — all three are system-computed (inferred memory,
-- cached aggregation, AI-generated reports), never written by a user
-- session directly. Read-only for `authenticated` from the start this
-- time — no retrofit needed, unlike billing_events/analytics_daily, since
-- this migration was written after (and in direct response to) that
-- lesson landing twice already this session. ──
alter table public.ai_memory        enable row level security;
alter table public.ai_context_cache enable row level security;
alter table public.growth_reports   enable row level security;

drop policy if exists ai_memory_select_own on public.ai_memory;
create policy ai_memory_select_own on public.ai_memory for select
  using (auth.uid() = user_id);

drop policy if exists ai_context_cache_select_own on public.ai_context_cache;
create policy ai_context_cache_select_own on public.ai_context_cache for select
  using (auth.uid() = user_id);

drop policy if exists growth_reports_select_own on public.growth_reports;
create policy growth_reports_select_own on public.growth_reports for select
  using (auth.uid() = user_id);
