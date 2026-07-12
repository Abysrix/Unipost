-- ─────────────────────────────────────────────────────────────
-- UniPost · Migration 0021 · Fix publishing_queue SECURITY INVOKER
--
-- The publishing_queue view was previously created without an explicit
-- security mode, which causes Postgres (and Supabase's security linter)
-- to treat it as SECURITY DEFINER — meaning it executes with the
-- privileges of the view owner (postgres/service_role), not the querying
-- user.
--
-- While the view was always safe in practice (it already has a hard
-- `user_id = auth.uid()` predicate preventing cross-user reads), the
-- implicit SECURITY DEFINER property bypasses any RLS policies on the
-- underlying `scheduled_posts` table that would otherwise apply to the
-- querying user.
--
-- This migration drops and recreates the view with SECURITY INVOKER so
-- that RLS on `scheduled_posts` is enforced correctly for the calling
-- session, eliminating the Supabase security advisory.
-- ─────────────────────────────────────────────────────────────

drop view if exists public.publishing_queue;

create view public.publishing_queue
  with (security_invoker = true)
  as
  select
    id,
    user_id,
    post_id,
    platform,
    scheduled_time,
    timezone,
    status,
    priority,
    position,
    retry_count,
    max_retries,
    error,
    published_at,
    created_at,
    updated_at
  from public.scheduled_posts
  where user_id = auth.uid()
    and status in ('scheduled', 'queued', 'publishing', 'failed')
  order by priority desc, position asc, scheduled_time asc;

-- Re-grant select access (dropped with the view)
grant select on public.publishing_queue to authenticated;
