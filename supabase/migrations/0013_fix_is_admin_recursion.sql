-- ─────────────────────────────────────────────────────────────
-- UniPost · Hotfix · private.is_admin() infinite recursion
--
-- Root cause of the live "stack depth limit exceeded" error on /billing
-- (surfaced via listBillingEvents()): Integration Sprint 1's 0010_profiles.sql
-- repointed private.is_admin() from reading the JWT's app_metadata claim to
-- querying `profiles` directly — `select role from public.profiles where id =
-- auth.uid()` — but left the function as plain SQL / SECURITY INVOKER. That
-- internal query is itself subject to `profiles`' own RLS, and
-- `profiles_select_own` is `(auth.uid() = id) or (select private.is_admin())`
-- — so evaluating is_admin() re-triggers profiles' policy, which calls
-- is_admin() again, forever. In practice this only actually recurses when
-- Postgres can't prove the row scan is trivially the caller's own row (a
-- single `.eq("id", auth.uid())` lookup like getOwnProfile() usually gets
-- optimized before ever evaluating the second OR-branch; an unfiltered
-- multi-row scan relying purely on RLS — exactly what listBillingEvents()
-- does — cannot), which is why this was isolated to billing_events (the one
-- table combining an unfiltered multi-row read with 0008_admin.sql's
-- `billing_events_admin_select` policy) rather than breaking every page.
-- integration_events/sync_logs share the identical admin-select shape and
-- were silently at risk of the same failure the first time either table
-- held more than one user's rows.
--
-- Fix: mark is_admin() SECURITY DEFINER so its internal profiles lookup
-- bypasses RLS instead of re-entering it — this is the sanctioned exception
-- to this project's standing "prefer SECURITY INVOKER" rule (see
-- ARCHITECTURE.md's Security model / the supabase skill's checklist):
-- private is a non-exposed schema, and the function already hard-codes
-- `id = auth.uid()` internally, so it still only ever answers "is the
-- actual calling session an admin" — nothing about any other row is ever
-- readable through it, definer or not.
-- ─────────────────────────────────────────────────────────────

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

-- ─────────────────────────────────────────────────────────────
-- Repair billing_events: a live debugging session (ad-hoc scripts, not a
-- migration) dropped and recreated this table while chasing the error
-- above, before the real cause was found. The recreated version reproduced
-- 0007's original policy set — select/insert/update/delete, all own-row —
-- which regressed two things: 0009_security_hardening's deliberate removal
-- of the own-row write policies (system-computed table; writes only via the
-- service-role client) and 0008_admin's admin-read policy (needed for the
-- admin Audit page's unified timeline). Restored to the correct, current
-- state; idempotent like every other migration here, safe to run whether or
-- not that recreate happened on a given environment.
-- ─────────────────────────────────────────────────────────────

drop policy if exists billing_events_insert_own on public.billing_events;
drop policy if exists billing_events_update_own on public.billing_events;
drop policy if exists billing_events_delete_own on public.billing_events;

drop policy if exists billing_events_select_own on public.billing_events;
create policy billing_events_select_own on public.billing_events for select
  using (auth.uid() = user_id);

drop policy if exists billing_events_admin_select on public.billing_events;
create policy billing_events_admin_select on public.billing_events for select
  to authenticated using ((select private.is_admin()));
