-- THE CONFESSION POST — Upgrade 04: public enclosures and two moods
-- Safe to re-run. Existing letters and legacy reply rows are preserved.

begin;

-- Remove the old three-mood check before introducing the new `spicy` value.
-- The transaction keeps the table protected from a partial migration.
alter table public.confessions
  drop constraint if exists confessions_mood_valid;

-- Migrate existing moods before installing the replacement constraint.
update public.confessions
set mood = 'flirty'
where mood = 'tender';

update public.confessions
set mood = 'spicy'
where mood = 'after-dark';

-- Stationery is now determined by mood. Preserve midnight Spicy sheets and
-- move legacy cream letters onto the Flirty rose sheet.
update public.confessions
set stationery = 'rose'
where mood = 'flirty'
  and stationery = 'cream';

alter table public.confessions
  add constraint confessions_mood_valid
  check (mood in ('flirty', 'spicy'));

alter table public.confessions
  alter column mood set default 'flirty';

alter table public.confessions
  alter column stationery set default 'rose';

-- Return notes are no longer exposed by the application. Keep their rows,
-- columns, and constraints intact; only retire the one-reply uniqueness index.
drop index if exists public.confessions_one_reader_reply_per_letter;

-- Media uses permanent public URLs with unguessable object paths. This also
-- safely reverses the bucket changes if Upgrade 02 lockdown was run earlier.
update storage.buckets
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'confession-images';

update storage.buckets
set public = true,
    allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']::text[]
where id = 'confession-audio';

-- Upgrade 02 lockdown is superseded. Keep database rows behind the
-- service-role-backed API, but do not revoke public storage-object reads.
drop policy if exists "anon can post confessions" on public.confessions;
drop policy if exists "anon can read confessions" on public.confessions;
drop policy if exists "anon can update confessions" on public.confessions;
revoke all on table public.confessions from anon, authenticated;

commit;
