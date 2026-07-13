-- ─────────────────────────────────────────────────────────────
-- UniPost · LaunchOps Phase 2 · Closed beta operations foundation
--
-- Additive schema for: error/crash monitoring, lightweight performance
-- sampling, feature ratings (distinct from support_tickets — a 1-5 star
-- reaction isn't a ticket needing resolution), and threaded support
-- ticket replies (incl. internal-only admin notes). No existing table's
-- data or behavior changes.
-- ─────────────────────────────────────────────────────────────

-- ── Error / crash monitoring ──
create table if not exists public.error_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  source       text not null check (source in ('unhandled_exception', 'api_failure', 'worker_failure', 'oauth_failure', 'publishing_failure', 'analytics_failure', 'client_error', 'other')),
  message      text not null,
  stack        text,
  context      jsonb not null default '{}'::jsonb,
  severity     text not null default 'error' check (severity in ('debug', 'info', 'warning', 'error', 'critical')),
  status       text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'ignored')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index if not exists error_logs_source_idx on public.error_logs (source, created_at desc);
create index if not exists error_logs_status_idx on public.error_logs (status, severity);
create index if not exists error_logs_user_idx on public.error_logs (user_id, created_at desc);

-- ── Lightweight performance sampling — one flexible sink specific code
-- paths write a duration to when convenient (publish time, analytics sync
-- time, a slow API route), rather than forcing bespoke tables or invasive
-- timing instrumentation through every layer of the app. ──
create table if not exists public.performance_samples (
  id          uuid primary key default gen_random_uuid(),
  metric      text not null,
  value_ms    integer not null,
  context     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists performance_samples_metric_idx on public.performance_samples (metric, created_at desc);

-- ── Feature ratings — "rate this AI output / publishing experience /
-- analytics", a quick reaction, not a ticket needing resolution. Separate
-- from support_tickets on purpose: a rating has no status/priority/
-- assignment lifecycle. context_id optionally points at the specific
-- ai_generations/scheduled_posts row being rated. ──
create table if not exists public.feature_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  feature     text not null check (feature in ('ai_output', 'publishing', 'analytics')),
  rating      integer not null check (rating between 1 and 5),
  context_id  text,
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists feature_ratings_feature_idx on public.feature_ratings (feature, created_at desc);

-- ── Support ticket extensions (Report Bug needs more than subject/message) ──
alter table public.support_tickets add column if not exists screenshot_url text;
alter table public.support_tickets add column if not exists device_info jsonb not null default '{}'::jsonb;
alter table public.support_tickets add column if not exists client_logs text;

-- ── Threaded replies on a ticket, including internal-only admin notes
-- (is_internal = true is never shown to the ticket's own owner). ──
create table if not exists public.support_ticket_replies (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.support_tickets (id) on delete cascade,
  author_id     uuid not null references auth.users (id) on delete cascade,
  is_internal   boolean not null default false,
  message       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists support_ticket_replies_ticket_idx on public.support_ticket_replies (ticket_id, created_at asc);

-- ── Row Level Security ──
alter table public.error_logs              enable row level security;
alter table public.performance_samples     enable row level security;
alter table public.feature_ratings         enable row level security;
alter table public.support_ticket_replies  enable row level security;

-- error_logs / performance_samples: purely internal operational data —
-- admin-only read, no own-row concept (a crash isn't "owned" the way a
-- rating or a ticket is). All writes are service-role.
drop policy if exists error_logs_admin_select on public.error_logs;
create policy error_logs_admin_select on public.error_logs for select
  to authenticated using ((select private.is_admin()));

drop policy if exists performance_samples_admin_select on public.performance_samples;
create policy performance_samples_admin_select on public.performance_samples for select
  to authenticated using ((select private.is_admin()));

-- feature_ratings: a user can see their own ratings; admin sees all.
-- System-computed (rating math shouldn't be user-editable after the fact),
-- so no update/delete policy — insert goes through the service-role client
-- with the caller's own uid, same pattern as xp_history/achievements.
drop policy if exists feature_ratings_select_own on public.feature_ratings;
create policy feature_ratings_select_own on public.feature_ratings for select
  to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));

-- support_ticket_replies: the ticket owner sees non-internal replies on
-- their own ticket; admins see everything including internal notes.
drop policy if exists support_ticket_replies_select on public.support_ticket_replies;
create policy support_ticket_replies_select on public.support_ticket_replies for select
  to authenticated using (
    (select private.is_admin())
    or (
      not is_internal
      and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select auth.uid()))
    )
  );
