-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 7 · RC1 — Missing updated_at Triggers
--
-- Database review (Phase 6) found two tables with an `updated_at` column
-- but no `set_updated_at` trigger attaching it — every other table with
-- this column in the schema has one (0001/0003/0004/0005/0006/0007/0008/
-- 0010/0014/0016 all attach it consistently); these two were missed.
--
-- usage_metrics: refreshUsageMetrics() (lib/db/billing.ts) upserts this
-- row on every billing-page read but never lists updated_at among the
-- columns it writes, so without a trigger the value freezes at whatever
-- it was on the first insert for that (user, period) — silently wrong for
-- a column whose entire purpose is "when was this snapshot last refreshed."
--
-- ai_memory: lib/ai/memory.ts already sets updated_at manually on its one
-- call site, so this is currently harmless in practice — added anyway for
-- the same reason every other table gets this trigger: so a future write
-- path doesn't have to remember to set it by hand.
--
-- Purely additive — no data changes, no destructive operations.
-- ─────────────────────────────────────────────────────────────

drop trigger if exists usage_metrics_set_updated_at on public.usage_metrics;
create trigger usage_metrics_set_updated_at before update on public.usage_metrics
  for each row execute function public.set_updated_at();

drop trigger if exists ai_memory_set_updated_at on public.ai_memory;
create trigger ai_memory_set_updated_at before update on public.ai_memory
  for each row execute function public.set_updated_at();
