-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 1 · Identity, RBAC & Real User Profiles
-- Depends on 0001 (public.set_updated_at()), 0008 (private schema, private.is_admin()).
--
-- Replaces app_metadata + an ADMIN_EMAILS env allow-list as the source of
-- truth for role/plan/display identity. Security design: a blanket own-row
-- UPDATE policy — the exact mistake migration 0007 made on the billing
-- tables — would let a user grant themselves admin by writing their own
-- `role` column directly. Instead of locking writes to service-role only
-- (which would force the genuinely self-editable fields — display_name/
-- username/avatar_url/bio/timezone — through a second API surface too), a
-- BEFORE UPDATE trigger snaps the privileged columns back to their previous
-- value whenever the write comes from a normal `authenticated` session —
-- service-role writes pass through untouched. One `.update()` from the
-- client works for the safe fields and is a silent no-op for the
-- privileged ones, instead of either blocking both or allowing both.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  display_name        text not null default '',
  username            text,
  avatar_url          text,
  bio                 text,
  timezone            text not null default 'UTC',
  role                text not null default 'creator' check (role in ('creator', 'admin', 'agency', 'enterprise')),
  plan                text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  creator_score       integer not null default 0,
  xp                  integer not null default 0,
  subscription_status text not null default 'free',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);
create unique index if not exists profiles_username_idx on public.profiles (username) where username is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Column-lockdown trigger: snap privileged columns back to their prior
-- value on a normal `authenticated` write, instead of blocking the whole
-- UPDATE. No elevated privilege needed — it only reads the JWT role claim
-- and the row values the trigger call already carries. ──
create or replace function private.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.plan := old.plan;
    new.creator_score := old.creator_score;
    new.xp := old.xp;
    new.subscription_status := old.subscription_status;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged before update on public.profiles
  for each row execute function private.protect_profile_privileged_columns();

-- ── Auto-create a profile for every new signup (email, Google OAuth, any
-- future method) — security definer, since there's no authenticated session
-- context yet for a brand-new user during their own creation. ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_app_meta_data ->> 'role', 'creator'),
    coalesce(new.raw_app_meta_data ->> 'plan', 'free')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Backfill profiles for every pre-existing user, preserving their current
-- role/plan from JWT claims so nobody gets demoted or downgraded by this
-- migration landing. ──
insert into public.profiles (id, email, display_name, avatar_url, role, plan)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data ->> 'avatar_url',
  coalesce(u.raw_app_meta_data ->> 'role', 'creator'),
  coalesce(u.raw_app_meta_data ->> 'plan', 'free')
from auth.users u
on conflict (id) do nothing;

-- ── Row Level Security ──
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select
  to authenticated using ((select auth.uid()) = id or (select private.is_admin()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert/delete policies for `authenticated` — profiles are created only
-- via the on_auth_user_created trigger (security definer) and removed only
-- via the auth.users cascade.

-- ── Repoint private.is_admin() at the profiles table instead of the JWT's
-- app_metadata claim. The JWT-claim version could stay valid for a demoted
-- admin until their token next refreshed; a table read is correct on the
-- very next request. Stays plain SQL / invoker — it only ever reads the
-- caller's own row (id = auth.uid()), which profiles_select_own already
-- permits, so there's nothing to bypass. ──
create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;
