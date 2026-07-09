-- ─────────────────────────────────────────────────────────────
-- UniPost · Sprint 3 · post-media storage bucket
-- Path convention: {user_id}/{post_id}/{filename}
-- Public read (social media is public once shared); owner-only writes.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Owner-only INSERT (first path segment must be the caller's uid)
drop policy if exists post_media_insert_own on storage.objects;
create policy post_media_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only UPDATE
drop policy if exists post_media_update_own on storage.objects;
create policy post_media_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only DELETE
drop policy if exists post_media_delete_own on storage.objects;
create policy post_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public READ (bucket is public)
drop policy if exists post_media_read_all on storage.objects;
create policy post_media_read_all on storage.objects
  for select using (bucket_id = 'post-media');
