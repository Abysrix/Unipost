-- ─────────────────────────────────────────────────────────────
-- UniPost · Integration Sprint 3 · Real Publishing Engine
-- Depends on 0004 (scheduled_posts, publishing_logs), 0006/0011 (connected_accounts).
--
-- Reuses scheduled_posts/publishing_logs rather than the brief's separately-
-- named published_posts/publishing_history/provider_post_ids/
-- publishing_failures/retry_queue tables — scheduled_posts already carries
-- status/retry_count/max_retries/error/published_at (Sprint 5), so two new
-- columns plus one on the existing publishing_logs audit table cover every
-- field the brief asks for, matching the same "derive, don't duplicate"
-- precedent as Sprint 5's publishing_queue view.
-- ─────────────────────────────────────────────────────────────

alter table public.scheduled_posts
  add column if not exists connected_account_id uuid references public.connected_accounts (id) on delete set null;
alter table public.scheduled_posts
  add column if not exists platform_post_id text;
create index if not exists scheduled_posts_account_idx on public.scheduled_posts (connected_account_id);

alter table public.publishing_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;
