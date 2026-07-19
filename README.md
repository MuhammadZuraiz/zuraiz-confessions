# The Confession Post ✉

A private post office for two, with Tender, Flirty, and deliberately concealed After Dark letters. Zuraiz writes from `/`, Qunoot reads and sends one brief return note from `/admin`, and Zuraiz sees delivery history and return post in `/sent`.

## Upgrade 02 rollout — order matters

The migration is split so existing letters and media stay available during the application switch.

1. Back up the Supabase project.
2. In Supabase SQL Editor, run `supabase/upgrade-02-prep.sql`. It is idempotent and keeps Upgrade 01 operational.
3. Add all variables from `.env.example` locally and in Vercel. Get the URL, anon key, and server-only service-role key from Supabase project settings. Use different private passphrases for `WRITER_PASSCODE` and `READER_PASSCODE`.
4. Generate `SESSION_SECRET` with at least 32 unpredictable characters. For example:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

5. Deploy this application and verify writer login, reader login, old letters, and one new test letter.
6. Immediately run `supabase/upgrade-02-lockdown.sql`. Do not run lockdown before the new deployment is ready: it makes both buckets private and revokes all anonymous table/storage access.
7. Verify an old `/storage/v1/object/public/...` media URL now fails, while the same enclosure still opens inside an authenticated letter.

For a new Supabase project, run `supabase/setup.sql`, `supabase/upgrade-01.sql`, and `supabase/upgrade-02-prep.sql` in that order, deploy with the six environment variables, then run `supabase/upgrade-02-lockdown.sql`.

The service-role key and passcodes are server secrets. Never place them in `lib/config.ts`, browser code, a `NEXT_PUBLIC_` variable, screenshots, or Git history.

## Upgrade 03 — films (original-quality video)

Videos are too large for Supabase's free tier (50 MB per-file cap), so film
enclosures live in a **private Cloudflare R2 bucket**: 10 GB storage and
unlimited downloads on the free tier, uploaded straight from the browser via
presigned URLs and played back through short-lived signed links. Same privacy
model as everything else — the bucket is private, and After Dark rules apply.

One-time setup:

1. In Supabase SQL Editor, run `supabase/upgrade-03-video.sql` (adds the
   `video_path` column; safe to re-run).
2. Create a Cloudflare account at dash.cloudflare.com and open **R2 Object
   Storage**. Enabling R2 asks for a payment method; usage within the free
   allowance (10 GB) bills $0.
3. Create a bucket, e.g. `confession-films`. Leave it **private** (do not
   enable the r2.dev public URL).
4. Bucket → **Settings → CORS policy**, paste (add your Vercel domain later):

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://YOUR-DOMAIN.vercel.app"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

5. R2 overview → **Manage R2 API Tokens** → Create API token with
   **Object Read & Write** scoped to that one bucket. Copy the Access Key ID
   and Secret Access Key.
6. Fill the four `R2_*` variables in `.env.local` (and later in Vercel):
   `R2_ACCOUNT_ID` (shown on the R2 overview page), `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_VIDEO_BUCKET` (the bucket name).

Until those variables are set, the site works normally — attempting to post a
film simply reports that film storage is not configured yet.

Notes: films upload as-recorded (MP4/MOV/WebM, up to 1 GB each) with a
progress percentage on the post button; playback links last six hours. If the
10 GB fills up someday, R2 overage is ~$0.015 per GB-month, or prune old films
in the Cloudflare dashboard.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the writer desk, `/admin` for the reader mailbox, and `/sent` for the writer ledger. Sessions are signed HttpOnly, Secure, SameSite=Strict cookies lasting 30 days. Modern browsers treat localhost as a secure development context; if a browser refuses the Secure cookie over local HTTP, use its HTTPS-localhost mode.

Production checks:

```bash
npm run lint
npm run build
```

## What Upgrade 02 adds

- Server-only writer and reader passcodes, separate signed sessions, explicit logout, same-origin mutation checks, and persistent five-attempt/15-minute login throttling keyed by an HMAC of role and IP.
- Private Supabase table/storage access through server-authorized endpoints, direct signed uploads, and five-minute signed media downloads.
- Tender, Flirty, and After Dark moods with matching stationery defaults and mailbox filters.
- After Dark sleeves that return no text or media URLs until `Open privately`, then cover and purge sensitive client state on blur, tab hiding, route change, or `Cover`.
- Memory-only After Dark composition: intimate text is never stored as a local browser draft.
- Browser-side full-dimension WebP re-encoding of every new photo. Posting rejects a photo if metadata-stripping processing fails; it never uploads the original as fallback.
- One reader return note per original letter, limited to 120 words and either one photo or one voice note. It inherits the original mood and concealment rules.
- Expanded reaction seals and an After Dark vault inside the unified mailbox. After Dark letters are excluded from automatic `On this day` excerpts.

Video, delete, unsend, view-once, expiry, and media revocation are intentionally not included. Existing enclosures remain permanent; EXIF removal applies only to newly selected photos because old files are not re-encoded.

## Focused verification after lockdown

- Writer and reader cookies cannot call each other's protected endpoints.
- Five wrong attempts block that role/IP for 15 minutes; logout removes only that role's session.
- Anonymous table reads/writes and public bucket URLs fail.
- Existing letters retain text, photos, voice, seal dates, reactions, opened/read history, and stationery.
- An After Dark mailbox response, page source, DOM, and browser network response contain no letter text or signed media URL before deliberate reveal.
- Revealed After Dark content covers on blur/visibility loss and can be reopened.
- A test JPG containing GPS/EXIF uploads as WebP with no EXIF metadata.
- A return note rejects 121+ words, a second reply, both photo and audio, and video.
- Tender and Flirty drafts, ceremonies, reactions, lightbox, audio, ledger, PWA manifest, mobile layout, lint, and production build pass.

## Vercel

Keep the Git repository private. Add all six variables from `.env.example` to Production (and Preview only if desired), deploy, perform the rollout above, then test `/`, `/admin`, and `/sent` over the HTTPS deployment. Installability should be tested on that deployed URL from Safari's **Add to Home Screen** or Chrome's **Install app** option.
