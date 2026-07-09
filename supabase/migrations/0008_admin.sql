-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 9 · Admin Control Center
-- (audit logs, system events, feature flags, platform health, support tickets)
-- Depends on 0001 (public.set_updated_at()).
--
-- NEW PATTERN vs. every prior migration: these tables are ADMIN-scoped, not
-- own-row. RLS policies check the caller's role (from app_metadata — NEVER
-- user_metadata, which is user-editable) via a small private.is_admin()
-- helper, wrapped in `(select ...)` so it's evaluated once per query rather
-- than once per row (Supabase's documented RLS performance pattern). All
-- WRITES to these tables happen through the service-role admin client
-- (lib/supabase/admin.ts) from trusted server code — there are deliberately
-- no `authenticated`-role write policies here (least privilege: regular
-- sessions, including admin sessions using the plain client, cannot write).
-- ─────────────────────────────────────────────────────────────

-- ── Admin role-check helper ──
-- Plain SQL (not security definer — it only reads the current request's JWT
-- claims via auth.jwt(), no privilege elevation or table access needed, so
-- there's nothing to bypass and nothing dangerous about running as invoker).
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
revoke execute on function private.is_admin() from anon, public;

-- ── Audit logs (logins, role changes, admin actions, security events, API errors) ──
-- Payments/subscriptions already live in billing_events (0007); OAuth/sync
-- activity in integration_events/sync_logs (0006); AI activity in
-- ai_generations (0004). The admin Audit page composes a unified timeline
-- from all of these — this table covers only the categories with nowhere
-- else to live.
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id) on delete set null,
  target_id   uuid references auth.users (id) on delete set null,
  category    text not null check (category in
                ('auth','role_change','admin_action','security','api_error')),
  event_type  text not null,
  message     text,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_target_idx  on public.audit_logs (target_id, created_at desc);
create index if not exists audit_logs_category_idx on public.audit_logs (category, created_at desc);

-- ── System events (platform-level, not user/admin-initiated: health checks, config changes) ──
create table if not exists public.system_events (
  id          uuid primary key default gen_random_uuid(),
  component   text not null,
  event_type  text not null,
  status      text check (status in ('healthy','warning','critical')),
  message     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists system_events_created_idx on public.system_events (created_at desc);
create index if not exists system_events_component_idx on public.system_events (component, created_at desc);

-- ── Feature flags ──
create table if not exists public.feature_flags (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  name         text not null,
  description  text,
  category     text not null default 'general' check (category in ('general','ai','beta','maintenance')),
  enabled      boolean not null default false,
  updated_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
create trigger feature_flags_set_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- Seed the well-known flags the app checks by key.
insert into public.feature_flags (key, name, description, category, enabled)
values
  ('maintenance_mode', 'Maintenance mode', 'Blocks non-admin access to the app with a maintenance screen.', 'maintenance', false),
  ('ai_studio_enabled', 'AI Studio', 'Master switch for AI Studio, chat and the Smart Editor.', 'ai', true),
  ('growth_coach_enabled', 'Growth Coach', 'Master switch for the AI Growth Coach recommendations feed.', 'ai', true),
  ('signups_enabled', 'New signups', 'Allow new account creation. Disable to freeze growth without downtime.', 'general', true)
on conflict (key) do nothing;

-- ── Platform health (current status per component; upserted on each check) ──
create table if not exists public.platform_health (
  id             uuid primary key default gen_random_uuid(),
  component      text not null unique,
  status         text not null check (status in ('healthy','warning','critical','unknown')),
  message        text,
  latency_ms     integer,
  checked_at     timestamptz not null default now()
);

-- ── Support tickets (future-ready: schema now, full ticketing UI later) ──
-- Own-row policies too (unlike the other tables here) — a user submitting
-- their own ticket is a real near-term use case, so this one is genuinely
-- ready to wire up a user-facing form with zero schema changes.
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject     text not null,
  message     text not null,
  status      text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists support_tickets_user_idx   on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──
alter table public.audit_logs      enable row level security;
alter table public.system_events   enable row level security;
alter table public.feature_flags   enable row level security;
alter table public.platform_health enable row level security;
alter table public.support_tickets enable row level security;

-- Admin-only read on the operational tables (writes are service-role only).
do $$
declare t text;
begin
  foreach t in array array['audit_logs','system_events','feature_flags','platform_health'] loop
    execute format('drop policy if exists %I_admin_select on public.%I;', t, t);
    execute format('create policy %I_admin_select on public.%I for select to authenticated using ((select private.is_admin()));', t, t);
  end loop;
end $$;

-- Admin-wide read on pre-existing tables the unified audit timeline (Phase 7)
-- composes from. 0006/0007 only granted own-row select policies, which would
-- make listUnifiedTimeline() silently show just the viewing admin's own
-- billing/integration/sync activity instead of platform-wide history. This
-- is purely additive — an extra `or (select private.is_admin())` read path —
-- and does not touch the existing own-row select/insert/update/delete policies.
do $$
declare t text;
begin
  foreach t in array array['billing_events','integration_events','sync_logs'] loop
    execute format('drop policy if exists %I_admin_select on public.%I;', t, t);
    execute format('create policy %I_admin_select on public.%I for select to authenticated using ((select private.is_admin()));', t, t);
  end loop;
end $$;

-- feature_flags: every signed-in user needs to READ flags (e.g. "is AI Studio
-- enabled") even though only admins can change them.
drop policy if exists feature_flags_read_all on public.feature_flags;
create policy feature_flags_read_all on public.feature_flags for select
  to authenticated using (true);

-- support_tickets: own-row for regular users, plus admin-sees-all.
drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets for select
  to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets for insert
  to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists support_tickets_update_own on public.support_tickets;
create policy support_tickets_update_own on public.support_tickets for update
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()))
  with check ((select auth.uid()) = user_id or (select private.is_admin()));

-- ── Sprint 9 small, backward-compatible extensions to earlier tables ──

-- AI response-time tracking (Phase 4). Nullable — existing rows are unaffected.
alter table public.ai_generations add column if not exists duration_ms integer;

-- Content moderation (Phase 6). Defaults preserve existing behavior exactly.
alter table public.posts add column if not exists flagged boolean not null default false;
alter table public.posts add column if not exists moderation_note text;
create index if not exists posts_flagged_idx on public.posts (flagged) where flagged = true;
