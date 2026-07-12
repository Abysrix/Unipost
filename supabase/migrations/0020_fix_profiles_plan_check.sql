-- ─────────────────────────────────────────────────────────────
-- UniPost · Migration 0020 · Fix profiles_plan_check constraint
--
-- Drops the old check constraint on the plan column which restricted it
-- to ('free', 'pro') and recreates it to include ('free', 'pro', 'agency').
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'agency'));
