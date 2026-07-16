-- ═══════════════════════════════════════════════════════════════
-- THE CONFESSION POST — Upgrade 01
-- Adds: unseal ceremony, reactions, voice notes, stationery.
-- Run AFTER setup.sql. Paste into the Supabase SQL editor and run.
-- Safe to re-run: everything is idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── New letter columns ──────────────────────────────────────────
alter table public.confessions
  add column if not exists opened_at  timestamptz,          -- first time a sealed letter was opened
  add column if not exists reaction   text,                 -- wax-seal reaction slug she pressed
  add column if not exists reacted_at timestamptz,
  add column if not exists audio_url  text,                 -- voice-note public URL
  add column if not exists stationery text not null default 'cream';

-- The anon key may update reader-side columns only.
revoke update on table public.confessions from anon, authenticated;
grant update (is_read, opened_at, reaction, reacted_at) on table public.confessions to anon;

-- ── Storage bucket for voice notes ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'confession-audio',
  'confession-audio',
  true,
  10485760, -- 10 MB per voice note
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];

drop policy if exists "anon can upload confession audio" on storage.objects;
create policy "anon can upload confession audio"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'confession-audio');

drop policy if exists "anyone can listen to confession audio" on storage.objects;
create policy "anyone can listen to confession audio"
  on storage.objects
  for select
  using (bucket_id = 'confession-audio');
