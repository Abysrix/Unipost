-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 2 · Social OAuth & Account Connection Platform
--
-- Two independent changes:
--
-- 1) RLS lockdown on the integration tables. Migration 0006 gave
--    `connected_accounts`/`oauth_tokens`/`platform_permissions`/`sync_logs`/
--    `integration_events` a blanket own-row INSERT/UPDATE/DELETE policy —
--    the same shape of gap Sprint 10's `0009_security_hardening.sql` closed
--    on the billing tables. `oauth_tokens` is the one that actually matters:
--    a user could INSERT/UPDATE their own row directly, and while they
--    can't forge a *working* token without the encryption key
--    (INTEGRATIONS_SECRET_KEY never reaches the client), they could still
--    corrupt their own connection state or fabricate `connected_accounts`
--    rows to bypass `completeConnection`'s plan-based connection-limit
--    check, which is application logic, not something RLS enforces on its
--    own. `lib/db/integrations.ts`'s writes move to the service-role client
--    in this same sprint (still gated by `uid()`/explicit `user_id` filters
--    in application code), so this can be safely locked down the same way
--    `0009` did for billing. Read access is untouched — every `_select_own`
--    policy stays exactly as it was in `0006`.
--
-- 2) `connected_accounts` gains `nickname` and `is_default` — Phase 4
--    ("Account Nickname", "Primary Account" / "Default Publishing
--    Account"). At most one default account per (user, platform), enforced
--    by a partial unique index rather than application code alone.
-- ─────────────────────────────────────────────────────────────

alter table public.connected_accounts add column if not exists nickname text;
alter table public.connected_accounts add column if not exists is_default boolean not null default false;

-- Partial unique index: at most one is_default=true row per (user_id, platform).
-- Rows with is_default=false are entirely unconstrained by this index.
create unique index if not exists connected_accounts_one_default_idx
  on public.connected_accounts (user_id, platform)
  where is_default = true;

do $$
declare t text;
begin
  foreach t in array array['connected_accounts','oauth_tokens','platform_permissions','sync_logs','integration_events'] loop
    execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
    execute format('drop policy if exists %I_update_own on public.%I;', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
  end loop;
end $$;
