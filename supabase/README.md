# Supabase migrations

Apply these **in order** before the Creator Studio works end-to-end.

## Option A — SQL Editor (fastest)
Open Supabase → **SQL Editor** → paste each file's contents and run, in order:
1. `migrations/0001_posts.sql` — the `posts` table, indexes, `updated_at` trigger, RLS.
2. `migrations/0002_post_media_storage.sql` — the `post-media` storage bucket + policies.

## Option B — Supabase CLI
```bash
supabase link --project-ref <your-ref>
supabase db push
```

## Notes
- RLS is **on**: a user can only read/write their own `posts` rows and only upload
  to `post-media/<their-uid>/…`.
- The bucket is **public-read** (social media is public once shared); writes are owner-only.
- `deleted_at` implements soft-delete (Trash / restore). Nothing is hard-deleted by the app.
