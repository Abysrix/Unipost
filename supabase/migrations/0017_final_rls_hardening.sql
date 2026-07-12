-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 7 · RC1 — Final RLS Hardening
--
-- Closes a gap flagged as a known risk since Sprint 10 and explicitly
-- deferred every sprint since ("lower severity than the billing tables,
-- but a materially larger blast radius to fix... recommended as a
-- dedicated follow-up, not bundled into Sprint 10"). This is that
-- follow-up, and the last chance to close it before launch.
--
-- xp_history, achievements, publishing_logs, sync_logs and
-- integration_events all carry migration 0004/0005/0006's original blanket
-- own-row INSERT/UPDATE/DELETE policy — the exact same shape that made the
-- billing tables (0009), the integrations tables (0011), analytics_daily/
-- creator_scores (0014), and billing_events (0013) all independently
-- exploitable before each was hardened. Concretely, before this migration,
-- an authenticated user could:
--   - INSERT into xp_history directly, awarding themselves arbitrary XP/levels
--   - INSERT into achievements directly, unlocking any achievement without
--     meeting checkNewAchievements()'s real criteria
--   - INSERT/UPDATE/DELETE publishing_logs / sync_logs / integration_events,
--     forging or erasing their own audit trail
--
-- sync_logs and integration_events already had every real write going
-- through the service-role client since Integration Sprint 2
-- (lib/db/integrations.ts::logSync/logEvent) — only the redundant policy
-- needed dropping here, no app code changed. xp_history (lib/db/xp.ts::
-- awardXp), achievements (lib/db/growth.ts::syncAchievements) and
-- publishing_logs (lib/db/schedule.ts::log) were still using the
-- request-scoped client and were converted to the admin client in this
-- same sprint, immediately before this migration — read access (`_select_own`)
-- is untouched throughout; every function already resolves its own
-- `user_id` via `uid()` before writing, so this doesn't widen who can call
-- them, only removes the client-side bypass around them.
-- ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['xp_history', 'achievements', 'publishing_logs', 'sync_logs', 'integration_events'] loop
    execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
    execute format('drop policy if exists %I_update_own on public.%I;', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
  end loop;
end $$;
