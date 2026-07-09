-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 10 · Production Hardening — RLS lockdown
--
-- Migration 0007 gave `subscriptions`, `payments`, `invoices`,
-- `ai_credit_history`, `usage_metrics` and `billing_events` a blanket
-- own-row INSERT/UPDATE/DELETE policy (copied from the pattern used for
-- genuinely user-edited data like `posts`). That was wrong for these six:
-- every real write to them is system-computed (a verified payment, a
-- credit grant, a monthly usage snapshot), never something a user is
-- supposed to edit directly. With the old policies, any authenticated user
-- could call `supabase.from('subscriptions').update({plan:'agency'})` (or
-- insert an arbitrary positive row into `ai_credit_history`) straight from
-- the browser, bypassing `confirmPayment`'s Razorpay signature check and
-- `spend_credits`'s balance logic entirely — a full paywall/credit-limit
-- bypass. `lib/db/billing.ts`'s writes were moved to the service-role
-- admin client in this same sprint (still gated by `uid()`/explicit
-- `user_id` filters in application code, exactly like the already-shipped
-- `adminConfirmPayment` webhook path) specifically so these policies could
-- be safely locked down without breaking checkout/credit grants. Only
-- `spend_credits` (a `security definer` RPC that re-checks `auth.uid()`
-- itself) still runs under the request-scoped client, and needs no policy
-- here — RPCs aren't gated by table RLS the same way.
--
-- Read access is untouched: every `_select_own` policy from 0007 stays as
-- it was, so users still see their own subscription/payments/invoices/
-- credit history/usage/events exactly as before.
-- ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['subscriptions','payments','invoices','ai_credit_history','usage_metrics','billing_events'] loop
    execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
    execute format('drop policy if exists %I_update_own on public.%I;', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
  end loop;
end $$;
