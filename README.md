# The Confession Post ✉

A private post office for two. Zuraiz writes Flirty or Spicy letters at `/`, Qunoot opens her mailbox at `/qunoot`, and Zuraiz sees delivery history at `/sent`. The old `/admin` address permanently redirects to `/qunoot`.

## Upgrade 04 rollout

Upgrade 04 keeps every existing letter and enclosure. Legacy return-note rows remain in the database but the application no longer reads or creates them.

1. Back up the Supabase project.
2. In the Supabase SQL Editor, run `supabase/upgrade-04.sql`. It is idempotent and performs the following explicit data migrations:
   - `tender` moods become `flirty`;
   - `after-dark` moods become `spicy`;
   - cream stationery on migrated Flirty letters becomes rose;
   - the obsolete one-reader-reply unique index is dropped without deleting replies;
   - the image limit becomes 20 MB and the image/audio buckets remain public.
3. In Cloudflare R2, enable the film bucket's **r2.dev development URL**.
4. Add that base URL as `R2_PUBLIC_BASE_URL` in `.env.local` and in Vercel.
5. Redeploy the application.

`supabase/upgrade-02-lockdown.sql` is now superseded and must not be run for the current application. Upgrade 04 contains its anonymous **table** policy removals and grants revocation, but intentionally does not make storage buckets private, remove public storage-object read policies, or restrict photos to WebP only. The image bucket accepts JPEG, PNG, and WebP.

For a new Supabase project, run `supabase/setup.sql`, `supabase/upgrade-01.sql`, `supabase/upgrade-02-prep.sql`, `supabase/upgrade-03-video.sql`, and `supabase/upgrade-04.sql` in that order.

## Privacy model

Writer and reader passcodes remain server-only. Separate signed HttpOnly, Secure, SameSite=Strict cookies protect the writer desk, reader mailbox, and all confession APIs. Login throttling and same-origin mutation checks remain enabled. The service-role key, passcodes, session secret, and R2 credentials must never be exposed through `NEXT_PUBLIC_` variables or committed to Git.

Supabase photos and voice notes, and Cloudflare R2 films, use permanent public URLs with unguessable UUID object paths. The APIs remain session-gated. A concealed Spicy letter's initial API response omits its text and every media URL; Qunoot receives them only after choosing **Open privately**. Revealed Spicy content covers and is removed from client state on blur, tab hiding, route change, or **Cover**. Spicy drafts are never stored in browser storage and Spicy letters are excluded from automatic **On this day** excerpts.

New photos are re-encoded to full-dimension WebP in the browser to remove EXIF, device, and location metadata. Both pre-encode and post-encode limits are 20 MB, and failed private processing rejects the upload instead of falling back to the original.

## Films

Films retain the existing direct upload flow: the server creates a short-lived presigned PUT URL and the browser uploads the original MP4, MOV, or WebM file directly to R2, up to 1 GB. Playback uses `R2_PUBLIC_BASE_URL/{video_path}`.

One-time Cloudflare setup:

1. Create or reuse the R2 film bucket.
2. In **Bucket → Settings → CORS policy**, allow `PUT` from localhost and the Vercel domain. Existing `GET` permission may remain.
3. Create an R2 API token with Object Read & Write access scoped to that bucket.
4. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_VIDEO_BUCKET` locally and in Vercel.
5. Enable the bucket's **r2.dev development URL** and set it as `R2_PUBLIC_BASE_URL` without a trailing slash.

## Local development

Copy `.env.example` to `.env.local`, supply the real values, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the writer desk, `/qunoot` for the reader mailbox, and `/sent` for the writer ledger.

Production checks:

```bash
npm run lint
npm run build
```

## Current experience

- Exactly two moods: Flirty on rose stationery and Spicy on midnight stationery.
- No stationery picker; changing mood immediately re-themes the compose sheet.
- Spicy private sleeves, deliberate reveal, automatic cover, and memory-only drafting.
- Sealed-date ceremony, postal animations, photos, voice notes, original-quality films, independent reactions, and PWA behavior remain intact.
- Exactly two reaction seals: ❤️ **love it** and 🤤 **left me drooling**. Unknown retired reaction slugs render nothing.
- Qunoot cannot upload or send return notes.

Keep the Git repository private. After deployment, test `/`, `/qunoot`, `/admin`, and `/sent` over HTTPS, including both roles, a Flirty letter, a concealed Spicy letter, all three enclosure types, the seal ceremony, and PWA installation.
