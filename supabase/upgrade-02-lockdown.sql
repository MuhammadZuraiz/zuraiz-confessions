-- THE CONFESSION POST — Upgrade 02, phase 2: lockdown
-- Run only after the Upgrade 02 application is deployed and verified.
-- This phase removes all anonymous data access and makes existing media private.

update storage.buckets
set public = false,
    allowed_mime_types = case
      when id = 'confession-images' then array['image/webp']::text[]
      else array['audio/webm', 'audio/mp4']::text[]
    end
where id in ('confession-images', 'confession-audio');

drop policy if exists "anon can post confessions" on public.confessions;
drop policy if exists "anon can read confessions" on public.confessions;
drop policy if exists "anon can update confessions" on public.confessions;
revoke all on table public.confessions from anon, authenticated;

drop policy if exists "anon can upload confession images" on storage.objects;
drop policy if exists "anyone can view confession images" on storage.objects;
drop policy if exists "anon can upload confession audio" on storage.objects;
drop policy if exists "anyone can listen to confession audio" on storage.objects;
