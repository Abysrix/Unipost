-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 7 · RC1 — Rate Limiting RPC Wrapper
-- ─────────────────────────────────────────────────────────────

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Restrict direct execution to the service_role client only.
  -- This prevents browser clients from calling this RPC directly to manually increment or spoof rate limits.
  if current_setting('role', true) <> 'service_role' then
    raise exception 'Permission denied. Only service_role can call check_rate_limit.';
  end if;

  return private.check_rate_limit(p_key, p_max, p_window_seconds);
end;
$$;

-- Grant execution only to service_role, revoke from authenticated/anon/public
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated, anon, public;
