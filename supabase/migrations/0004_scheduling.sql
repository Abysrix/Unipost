-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 5 · Scheduling & Publishing Engine
-- Depends on 0001 (public.set_updated_at(), public.posts).
-- Model: ONE scheduled_posts row per (post × platform) — Buffer-style
-- per-channel scheduling, so each channel has its own status/queue/retry.
-- The "queue" is a derived projection of scheduled_posts (status + position),
-- exposed at the SQL layer by the publishing_queue view. Single source of truth.
-- Requires Postgres 15+ (Supabase default).
-- ─────────────────────────────────────────────────────────────

-- ── Scheduled posts (calendar events + queue items) ──
create table if not exists public.scheduled_posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  post_id        uuid not null references public.posts (id) on delete cascade,
  platform       text not null,
  scheduled_time timestamptz not null,
  timezone       text not null default 'Asia/Kolkata',
  duration_min   integer not null default 30 check (duration_min between 5 and 1440),
  status         text not null default 'scheduled'
                   check (status in ('scheduled','queued','publishing','published','failed','canceled')),
  priority       boolean not null default false,
  position       integer not null default 0,
  retry_count    integer not null default 0,
  max_retries    integer not null default 3,
  error          text,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists scheduled_posts_user_time_idx  on public.scheduled_posts (user_id, scheduled_time);
create index if not exists scheduled_posts_status_idx      on public.scheduled_posts (user_id, status);
create index if not exists scheduled_posts_queue_idx       on public.scheduled_posts (user_id, platform, position);
create index if not exists scheduled_posts_post_idx        on public.scheduled_posts (post_id);

drop trigger if exists scheduled_posts_set_updated_at on public.scheduled_posts;
create trigger scheduled_posts_set_updated_at before update on public.scheduled_posts
  for each row execute function public.set_updated_at();

-- ── Publishing logs (lifecycle audit trail) ──
create table if not exists public.publishing_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  scheduled_post_id  uuid not null references public.scheduled_posts (id) on delete cascade,
  post_id            uuid,
  platform           text not null,
  status             text not null,
  message            text,
  created_at         timestamptz not null default now()
);
create index if not exists publishing_logs_user_idx on public.publishing_logs (user_id, created_at desc);
create index if not exists publishing_logs_sched_idx on public.publishing_logs (scheduled_post_id, created_at);

-- ── Row Level Security (own-row on both tables) ──
alter table public.scheduled_posts enable row level security;
alter table public.publishing_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['scheduled_posts','publishing_logs'] loop
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

-- ── Publishing queue (derived view; scoped to the caller, RLS-safe) ──
-- The explicit `user_id = auth.uid()` predicate scopes rows per-user even though
-- the view runs as its owner — no cross-user leakage. Read-only; all queue
-- mutations go through scheduled_posts.
drop view if exists public.publishing_queue;
create view public.publishing_queue as
  select id, user_id, post_id, platform, scheduled_time, timezone, status,
         priority, position, retry_count, max_retries, error, published_at,
         created_at, updated_at
  from public.scheduled_posts
  where user_id = auth.uid()
    and status in ('scheduled','queued','publishing','failed')
  order by priority desc, position asc, scheduled_time asc;

grant select on public.publishing_queue to authenticated;
