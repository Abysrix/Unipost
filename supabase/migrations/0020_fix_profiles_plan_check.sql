-- ─────────────────────────────────────────────────────────────
-- UniPost · Migration 0020 · Convert plan column to ENUM dropdown
--
-- Creates a custom ENUM type plan_type and alters the profiles table
-- to use it instead of a text datatype with CHECK constraints.
-- This makes Supabase dashboard render it as a clean dropdown selector.
-- Also heals and syncs any profiles with their active subscriptions.
-- ─────────────────────────────────────────────────────────────

-- 1. Create the enum type
DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'agency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Drop the old check constraint and default value
ALTER TABLE public.profiles ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 3. Alter the column type to the new enum, converting existing text values
ALTER TABLE public.profiles 
  ALTER COLUMN plan TYPE public.plan_type USING plan::public.plan_type;

-- 4. Set the default value back
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'free'::public.plan_type;

-- 5. Synchronize profiles plan with active subscriptions plan
UPDATE public.profiles p
SET plan = s.plan::public.plan_type
FROM public.subscriptions s
WHERE p.id = s.user_id AND p.plan::text <> s.plan::text;
