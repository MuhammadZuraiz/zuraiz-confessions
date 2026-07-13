-- ═══════════════════════════════════════════════════════════════
-- THE CONFESSION POST — one-shot Supabase setup
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run: everything is idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── The confessions table ──────────────────────────────────────
create table if not exists public.confessions (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  image_url  text,
  image_urls text[] not null default '{}'::text[],
  unlock_date date,
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),
  constraint confessions_image_urls_max_10 check (cardinality(image_urls) <= 10)
);

alter table public.confessions enable row level security;

-- The app talks to Supabase with the anon key only:
--   · the API route inserts new letters
--   · the mailbox page reads them and flips is_read
drop policy if exists "anon can post confessions" on public.confessions;
create policy "anon can post confessions"
  on public.confessions
  for insert
  to anon
  with check (true);

drop policy if exists "anon can read confessions" on public.confessions;
create policy "anon can read confessions"
  on public.confessions
  for select
  to anon
  using (true);

drop policy if exists "anon can update confessions" on public.confessions;
create policy "anon can update confessions"
  on public.confessions
  for update
  to anon
  using (true)
  with check (true);

-- Belt & braces: even with the update policy above, the anon key may
-- only ever touch the is_read column (column-level grant).
revoke update on table public.confessions from anon, authenticated;
grant update (is_read) on table public.confessions to anon;

-- ── Storage bucket for enclosed photos ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'confession-images',
  'confession-images',
  true,
  10485760, -- 10 MB per photo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "anon can upload confession images" on storage.objects;
create policy "anon can upload confession images"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'confession-images');

drop policy if exists "anyone can view confession images" on storage.objects;
create policy "anyone can view confession images"
  on storage.objects
  for select
  using (bucket_id = 'confession-images');
