-- THE CONFESSION POST — Upgrade 02, phase 1: prepare
-- Run while Upgrade 01 is still live. This phase is idempotent and does not
-- remove the old anonymous policies or make the buckets private.

alter table public.confessions
  add column if not exists mood text not null default 'tender',
  add column if not exists sender_role text not null default 'writer',
  add column if not exists reply_to uuid,
  add column if not exists image_paths text[] not null default '{}'::text[],
  add column if not exists audio_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'confessions_mood_valid') then
    alter table public.confessions
      add constraint confessions_mood_valid
      check (mood in ('tender', 'flirty', 'after-dark'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'confessions_sender_role_valid') then
    alter table public.confessions
      add constraint confessions_sender_role_valid
      check (sender_role in ('writer', 'reader'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'confessions_reply_parent') then
    alter table public.confessions
      add constraint confessions_reply_parent
      foreign key (reply_to) references public.confessions(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'confessions_reply_not_self') then
    alter table public.confessions
      add constraint confessions_reply_not_self check (reply_to is null or reply_to <> id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'confessions_role_matches_reply') then
    alter table public.confessions
      add constraint confessions_role_matches_reply
      check (
        (sender_role = 'writer' and reply_to is null)
        or (sender_role = 'reader' and reply_to is not null)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'confessions_private_paths_valid') then
    alter table public.confessions
      add constraint confessions_private_paths_valid
      check (
        cardinality(image_paths) <= 10
        and (
          sender_role = 'writer'
          or (cardinality(image_paths) <= 1 and not (cardinality(image_paths) = 1 and audio_path is not null))
        )
      );
  end if;
end $$;

create unique index if not exists confessions_one_reader_reply_per_letter
  on public.confessions (reply_to)
  where reply_to is not null and sender_role = 'reader';

create index if not exists confessions_reply_to_idx on public.confessions (reply_to);
create index if not exists confessions_mood_idx on public.confessions (mood);

-- Backfill object paths from Upgrade 01 public URLs. The legacy URL columns
-- stay in place temporarily for rollback but Upgrade 02 never returns them.
update public.confessions c
set image_paths = coalesce(
  (
    select array_agg(split_part(url, '/object/public/confession-images/', 2))
    from unnest(
      case
        when cardinality(coalesce(c.image_urls, '{}'::text[])) > 0 then c.image_urls
        when c.image_url is not null then array[c.image_url]
        else '{}'::text[]
      end
    ) as url
    where position('/object/public/confession-images/' in url) > 0
  ),
  '{}'::text[]
)
where cardinality(c.image_paths) = 0;

update public.confessions
set audio_path = split_part(audio_url, '/object/public/confession-audio/', 2)
where audio_path is null
  and audio_url is not null
  and position('/object/public/confession-audio/' in audio_url) > 0;

create table if not exists public.auth_rate_limits (
  key text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from anon, authenticated;
