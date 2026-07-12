-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 7 · RC1 — Rate Limiting
--
-- Closes "No rate-limiting anywhere" — flagged as a known gap since
-- Sprint 10's own audit ("the single biggest remaining gap between this
-- codebase and 'actually launch-ready'") and repeated in every sprint's
-- known-risks list since. This is the last sprint before launch, so this
-- is where it gets closed.
--
-- Postgres-backed, not in-memory: this app deploys to serverless (Vercel),
-- where every function invocation can land on a different instance with
-- its own fresh memory — an in-memory counter would silently do nothing in
-- production while looking like it works in local dev. Postgres is the one
-- piece of shared state every instance already talks to, so it's the only
-- honest place to put this without introducing a new piece of
-- infrastructure (Redis/Upstash) this late, for a project that doesn't
-- otherwise need one.
--
-- Fixed-window counting, not sliding — simpler, and precise enough for
-- abuse/brute-force prevention (the target is "stop a script hammering
-- /login 500 times a minute," not sub-second billing precision).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.rate_limits (
  bucket_key    text not null,
  window_start  timestamptz not null,
  count         integer not null default 1,
  primary key (bucket_key, window_start)
);
-- No secondary index needed beyond the PK — every real query is a point
-- lookup/upsert on (bucket_key, window_start). Retention cleanup (below)
-- scans by window_start, cheap enough at this table's expected size
-- without a dedicated index.

-- ── Atomic check-and-increment. SECURITY DEFINER is genuinely required
-- here (not a shortcut around a permission error): this must be callable
-- by any request — including a not-yet-authenticated one hitting /login —
-- and the whole point is a shared counter no single request's own
-- privileges could safely read/write directly. Non-exposed schema, no
-- user-supplied SQL, `bucket_key` is always an app-constructed string
-- (action name + IP or user id), never raw user input. Run `supabase db
-- advisors` after applying — same standing instruction as every
-- SECURITY DEFINER function in this project. ──
create or replace function private.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (bucket_key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

grant execute on function private.check_rate_limit(text, integer, integer) to authenticated, anon;

-- ── Row Level Security — purely internal counter state, no direct
-- table access for anyone; only the SECURITY DEFINER function above (and
-- the service-role cleanup job) ever touches this table. ──
alter table public.rate_limits enable row level security;
