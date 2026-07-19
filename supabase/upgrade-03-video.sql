-- THE CONFESSION POST — Upgrade 03: films
-- Videos are stored in a private Cloudflare R2 bucket (original quality);
-- Supabase only keeps the object path. Idempotent, safe to re-run.

alter table public.confessions
  add column if not exists video_path text;
