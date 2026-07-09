-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 8 · Billing, Subscriptions & AI Credit System
-- (subscriptions, payments, invoices, credit ledger, usage snapshots, billing events)
-- Depends on 0001 (public.set_updated_at()).
-- ─────────────────────────────────────────────────────────────

-- ── Subscriptions (one row per user; auto-provisioned as 'free' on first read) ──
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users (id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free','pro','agency')),
  status                 text not null default 'active' check (status in ('active','past_due','canceled','trialing')),
  billing_cycle          text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  current_period_start   timestamptz not null default now(),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  razorpay_customer_id   text,
  razorpay_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_status_idx on public.subscriptions (user_id, status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── Payments (one row per checkout attempt) ──
create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  subscription_id    uuid references public.subscriptions (id) on delete set null,
  plan               text not null check (plan in ('free','pro','agency')),
  billing_cycle      text not null check (billing_cycle in ('monthly','yearly')),
  amount             integer not null, -- paise (INR)
  currency           text not null default 'INR',
  status             text not null default 'created' check (status in ('created','captured','failed','refunded')),
  razorpay_order_id  text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (razorpay_order_id)
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ── Invoices ──
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id      uuid references public.payments (id) on delete set null,
  invoice_number  text not null,
  plan            text not null,
  billing_cycle   text not null,
  amount          integer not null, -- paise
  currency        text not null default 'INR',
  status          text not null default 'paid' check (status in ('paid','open','void')),
  period_start    timestamptz not null,
  period_end      timestamptz,
  invoice_url     text,
  created_at      timestamptz not null default now(),
  unique (invoice_number)
);
create index if not exists invoices_user_idx on public.invoices (user_id, created_at desc);

-- ── AI credit ledger (append-only; balance = SUM(amount), same shape as xp_history) ──
create table if not exists public.ai_credit_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      integer not null, -- + grants/resets, - consumption
  reason      text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ai_credit_history_user_idx on public.ai_credit_history (user_id, created_at desc);
create unique index if not exists ai_credit_history_unique_key_idx
  on public.ai_credit_history (user_id, reason, (meta->>'key'))
  where meta ? 'key';

-- Atomic "check balance, then deduct" — a plain check-then-insert from application
-- code has a race under concurrent requests (two AI calls could both read the same
-- balance before either records its spend). An advisory lock serializes concurrent
-- spends for the SAME user only, so unrelated users are never blocked by each other.
-- security definer + a fixed search_path so it runs with the function owner's
-- privileges (needed to bypass RLS for the balance read) without being hijackable
-- via a malicious search_path.
create or replace function public.spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_key text, p_meta jsonb default '{}'::jsonb)
returns table (ok boolean, balance integer) language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  -- security definer bypasses RLS, so the function itself must enforce that
  -- callers can only spend their OWN credits — never another user's.
  if p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized to spend credits for this user.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount), 0) into v_balance from public.ai_credit_history where user_id = p_user_id;

  if v_balance < p_amount then
    return query select false, v_balance;
    return;
  end if;

  insert into public.ai_credit_history (user_id, amount, reason, meta)
  values (p_user_id, -p_amount, p_reason, case when p_key is not null then p_meta || jsonb_build_object('key', p_key) else p_meta end)
  on conflict do nothing;

  select coalesce(sum(amount), 0) into v_balance from public.ai_credit_history where user_id = p_user_id;
  return query select true, v_balance;
end;
$$;

grant execute on function public.spend_credits(uuid, integer, text, text, jsonb) to authenticated;

-- ── Usage snapshots (one row per user per calendar month; refreshed on billing-page read) ──
create table if not exists public.usage_metrics (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  period                date not null, -- first-of-month marker
  ai_credits_used       integer not null default 0,
  scheduled_posts_count integer not null default 0,
  connected_accounts_count integer not null default 0,
  storage_bytes_used    bigint not null default 0,
  updated_at            timestamptz not null default now(),
  unique (user_id, period)
);
create index if not exists usage_metrics_user_idx on public.usage_metrics (user_id, period desc);

-- ── Billing events (full lifecycle audit trail, same pattern as integration_events) ──
create table if not exists public.billing_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_type  text not null check (event_type in
                ('subscription_created','subscription_upgraded','subscription_downgraded',
                 'subscription_canceled','subscription_renewed','subscription_reactivated',
                 'payment_succeeded','payment_failed','credits_reset','credits_granted')),
  message     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists billing_events_user_idx on public.billing_events (user_id, created_at desc);

-- ── Row Level Security (own-row on every table) ──
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.invoices           enable row level security;
alter table public.ai_credit_history  enable row level security;
alter table public.usage_metrics      enable row level security;
alter table public.billing_events     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['subscriptions','payments','invoices','ai_credit_history','usage_metrics','billing_events'] loop
    execute format('drop policy if exists %I_select_own on public.%I;', t, t);
    execute format('create policy %I_select_own on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
    execute format('create policy %I_insert_own on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists %I_update_own on public.%I;', t, t);
    execute format('create policy %I_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
    execute format('create policy %I_delete_own on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;
