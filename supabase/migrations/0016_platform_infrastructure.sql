-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 6 · Platform Infrastructure, Automation & Observability
-- Depends on 0001 (public.set_updated_at()).
--
-- The brief's Phase 9 suggested 8 tables (jobs, job_logs, worker_status,
-- cron_history, notification_queue, system_health, webhook_events,
-- failed_jobs). Three are consolidated onto what this migration already
-- creates rather than duplicated, same reuse-first precedent every prior
-- Integration Sprint has followed:
--   - worker_status  → derived from the latest cron_history row per
--     cron_name (below) — a worker's status IS "what did its last run do,"
--     nothing else needs tracking separately.
--   - system_health  → extends the existing computeHealthChecks()
--     (lib/admin/health-checks.ts, Sprint 9) with real DB-driven checks
--     (queue depth, cron recency) rather than a new persisted table — that
--     function already computes health on read; a table would just be a
--     cache of something cheap enough not to need one.
--   - failed_jobs    → `jobs where status = 'failed'` is already exactly
--     the dead-letter queue — a separate table would just duplicate rows
--     that already exist in `jobs`.
-- ─────────────────────────────────────────────────────────────

-- ── Generic job queue — any async work (AI report generation, notification
-- delivery, cleanup; publishing/analytics keep their own existing
-- state machines — see this sprint's log entry for why those aren't
-- migrated onto this table) enqueues here. ──
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  job_type      text not null,
  status        text not null default 'queued'
                  check (status in ('queued','running','completed','failed','retrying','cancelled')),
  payload       jsonb not null default '{}'::jsonb,
  payload_hash  text,
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  priority      integer not null default 0,
  run_after     timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  error         text,
  user_id       uuid references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists jobs_claim_idx on public.jobs (job_type, status, run_after);
create index if not exists jobs_user_idx on public.jobs (user_id, created_at desc);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ── Per-job execution log — append-only, the actual "what happened" trail
-- structured logging (Phase 6) writes to. ──
create table if not exists public.job_logs (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  level       text not null default 'info' check (level in ('debug','info','warn','error')),
  message     text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists job_logs_job_idx on public.job_logs (job_id, created_at);

-- ── Cron run history — every scheduled invocation (existing
-- /api/cron/publish, /api/cron/analytics, and this sprint's new
-- /api/cron/jobs) logs one row per run here, regardless of which table its
-- own business logic actually touches. This is the real "worker_status." ──
create table if not exists public.cron_history (
  id           uuid primary key default gen_random_uuid(),
  cron_name    text not null,
  status       text not null check (status in ('running','completed','failed')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  summary      jsonb not null default '{}'::jsonb,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists cron_history_name_idx on public.cron_history (cron_name, started_at desc);

-- ── In-app notifications — the Topbar's NotificationBell (Sprint 2) has
-- always had an empty-state UI and nothing to fill it; this is that data
-- source. Event-driven: written directly by the action that triggers it
-- (publish succeeded/failed, first real analytics sync, payment events),
-- not queued through `jobs` itself — the write is a fast single insert,
-- not slow/unreliable work worth decoupling. Only *delivery* (email) is a
-- background job (lib/jobs/workers/notificationWorker.ts). ──
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null,
  title        text not null,
  message      text not null,
  action_href  text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ── Webhook events — every inbound webhook (Meta, X, Razorpay) logs here
-- first, before any processing. `payload_hash` (sha256 of the raw body) +
-- the unique index below is the real idempotency mechanism: a provider
-- retry of the identical payload hits the unique violation and is skipped,
-- not reprocessed. ──
create table if not exists public.webhook_events (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null,
  event_type      text,
  payload_hash    text not null,
  payload         jsonb not null default '{}'::jsonb,
  signature_valid boolean not null,
  status          text not null default 'received' check (status in ('received','processed','failed','ignored')),
  error           text,
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create unique index if not exists webhook_events_idempotency_idx on public.webhook_events (provider, payload_hash);
create index if not exists webhook_events_provider_idx on public.webhook_events (provider, created_at desc);

-- ── Row Level Security ──
-- jobs/job_logs/cron_history/webhook_events are entirely system-internal —
-- no `authenticated`-role policy at all (not even read-only own-row: a job's
-- `user_id` being present doesn't mean that user should see queue internals
-- like `payload`/`error`, which is exactly the kind of thing Phase 10's "no
-- sensitive data in logs" note is warning about). All access is
-- service-role (cron/worker code) or the admin console (lib/db/admin/*,
-- already service-role-only). notifications IS user-facing (the whole
-- point is a user reading their own) — own-row select, same read-only
-- system-computed pattern as every other table this Integration Phase has
-- applied proactively.
alter table public.jobs            enable row level security;
alter table public.job_logs        enable row level security;
alter table public.cron_history    enable row level security;
alter table public.webhook_events  enable row level security;
alter table public.notifications   enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select
  using (auth.uid() = user_id);

-- Marking a notification read is the one thing a user directly does to
-- their own row — narrow, safe own-row update (nothing else on this table
-- is user-writable: no insert/delete policy, so a user can't fabricate
-- fake notifications or destroy their own history).
drop policy if exists notifications_update_own_read_state on public.notifications;
create policy notifications_update_own_read_state on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
