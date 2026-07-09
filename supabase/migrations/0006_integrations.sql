-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 7 · Social Integration Platform
-- (connected accounts, encrypted OAuth tokens, permissions, sync + event logs)
-- Depends on 0001 (public.set_updated_at()).
-- ─────────────────────────────────────────────────────────────

-- ── Connected accounts (one row per external account a user has linked) ──
create table if not exists public.connected_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  platform       text not null,
  -- The external provider's account id — unique per platform, not globally.
  account_id     text not null,
  display_name   text not null default '',
  username       text,
  profile_image  text,
  status         text not null default 'connected'
                   check (status in ('connected','expired','revoked','error','disconnected')),
  last_sync_at   timestamptz,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, platform, account_id)
);
create index if not exists connected_accounts_user_idx     on public.connected_accounts (user_id, platform);
create index if not exists connected_accounts_status_idx   on public.connected_accounts (user_id, status);

drop trigger if exists connected_accounts_set_updated_at on public.connected_accounts;
create trigger connected_accounts_set_updated_at before update on public.connected_accounts
  for each row execute function public.set_updated_at();

-- ── OAuth tokens (kept separate from the account profile; encrypted at rest) ──
-- Application-layer AES-256-GCM (lib/integrations/crypto.ts) — the DB only ever
-- sees ciphertext. Never selected except by code that's about to use a token.
create table if not exists public.oauth_tokens (
  id                    uuid primary key default gen_random_uuid(),
  connected_account_id  uuid not null unique references public.connected_accounts (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  access_token_enc      text not null,
  refresh_token_enc     text,
  token_type            text not null default 'bearer',
  scope                 text,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists oauth_tokens_account_idx on public.oauth_tokens (connected_account_id);
create index if not exists oauth_tokens_expiry_idx  on public.oauth_tokens (expires_at);

drop trigger if exists oauth_tokens_set_updated_at on public.oauth_tokens;
create trigger oauth_tokens_set_updated_at before update on public.oauth_tokens
  for each row execute function public.set_updated_at();

-- ── Platform permissions (which OAuth scopes were requested vs. actually granted) ──
create table if not exists public.platform_permissions (
  id                    uuid primary key default gen_random_uuid(),
  connected_account_id  uuid not null references public.connected_accounts (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  scope                 text not null,
  granted               boolean not null default true,
  created_at            timestamptz not null default now(),
  unique (connected_account_id, scope)
);
create index if not exists platform_permissions_account_idx on public.platform_permissions (connected_account_id);

-- ── Sync logs (audit trail for manual/auto sync + token-refresh operations) ──
create table if not exists public.sync_logs (
  id                    uuid primary key default gen_random_uuid(),
  connected_account_id  uuid not null references public.connected_accounts (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  sync_type             text not null check (sync_type in ('manual','auto','token_refresh','profile','health_check')),
  status                text not null check (status in ('success','failed')),
  message               text,
  created_at            timestamptz not null default now()
);
create index if not exists sync_logs_account_idx on public.sync_logs (connected_account_id, created_at desc);
create index if not exists sync_logs_user_idx    on public.sync_logs (user_id, created_at desc);

-- ── Integration events (the full connection lifecycle audit trail) ──
create table if not exists public.integration_events (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  connected_account_id  uuid references public.connected_accounts (id) on delete cascade,
  platform              text not null,
  event_type            text not null check (event_type in
                           ('connected','reconnected','disconnected','revoked',
                            'token_refreshed','sync_completed','sync_failed','permission_changed')),
  message               text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);
create index if not exists integration_events_user_idx on public.integration_events (user_id, created_at desc);
create index if not exists integration_events_account_idx on public.integration_events (connected_account_id, created_at desc);

-- ── Row Level Security (own-row on every table) ──
alter table public.connected_accounts   enable row level security;
alter table public.oauth_tokens         enable row level security;
alter table public.platform_permissions enable row level security;
alter table public.sync_logs            enable row level security;
alter table public.integration_events   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['connected_accounts','oauth_tokens','platform_permissions','sync_logs','integration_events'] loop
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
