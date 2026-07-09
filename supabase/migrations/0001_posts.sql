-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 3 · posts (Creator Studio drafts)
-- Apply in Supabase → SQL Editor, or via `supabase db push`.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  status      text not null default 'draft'
                check (status in ('draft', 'scheduled', 'published', 'archived')),
  platforms   text[] not null default '{}',
  media       jsonb  not null default '[]'::jsonb,
  visibility  text not null default 'public'
                check (visibility in ('public', 'private', 'unlisted')),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_user_id_idx    on public.posts (user_id);
create index if not exists posts_status_idx      on public.posts (user_id, status);
create index if not exists posts_updated_at_idx  on public.posts (user_id, updated_at desc);

-- Keep updated_at fresh on every update.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ── Row Level Security: a user may only touch their own posts ──
alter table public.posts enable row level security;

drop policy if exists posts_select_own on public.posts;
create policy posts_select_own on public.posts
  for select using (auth.uid() = user_id);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert with check (auth.uid() = user_id);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete using (auth.uid() = user_id);
