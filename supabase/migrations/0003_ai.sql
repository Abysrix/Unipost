-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 4 · AI Studio (conversations, messages, prompts, history)
-- Depends on 0001 (public.set_updated_at()).
-- ─────────────────────────────────────────────────────────────

-- ── Conversations ──
create table if not exists public.ai_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  title           text not null default 'New chat',
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, last_message_at desc);
create index if not exists ai_conversations_pinned_idx on public.ai_conversations (user_id, pinned);

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- ── Messages ──
create table if not exists public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.ai_conversations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- ── Saved prompts ──
create table if not exists public.saved_prompts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  body        text not null,
  category    text not null default 'general',
  favorite    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists saved_prompts_user_idx on public.saved_prompts (user_id, updated_at desc);
create index if not exists saved_prompts_favorite_idx on public.saved_prompts (user_id, favorite);

drop trigger if exists saved_prompts_set_updated_at on public.saved_prompts;
create trigger saved_prompts_set_updated_at before update on public.saved_prompts
  for each row execute function public.set_updated_at();

-- ── Generation history ──
create table if not exists public.ai_generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  action      text not null,
  input       jsonb not null default '{}'::jsonb,
  output      text not null default '',
  favorite    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ai_generations_user_idx on public.ai_generations (user_id, created_at desc);
create index if not exists ai_generations_favorite_idx on public.ai_generations (user_id, favorite);

-- ── Row Level Security (own-row on every table) ──
alter table public.ai_conversations enable row level security;
alter table public.ai_messages       enable row level security;
alter table public.saved_prompts      enable row level security;
alter table public.ai_generations     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ai_conversations','ai_messages','saved_prompts','ai_generations'] loop
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
