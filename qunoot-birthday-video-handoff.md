# Handoff: add a video ("film") enclosure to qunoot-birthday confessions

This document is self-contained. It describes how to add pre-recorded video
uploads to the confessions feature of the project at
`C:\Users\zurai\Desktop\qunoot-birthday\qunoot-birthday`, following the
architecture that project already uses. Do not import patterns from other
projects — this repo is intentionally simpler.

## The problem being solved

iPhone videos are large (60–400 MB per minute) and the project's Supabase free
plan caps uploads at 50 MB per file with 1 GB total storage — so videos cannot
go into Supabase Storage. Instead, video bytes go to a **Cloudflare R2** bucket
(free tier: 10 GB storage, unlimited egress, multi-GB file support) while the
Supabase `confessions` row just stores the video URL, exactly like it already
stores public image URLs. Videos upload **at original quality — no compression,
no quality options, no storage meters in the UI**. Keep the feature minimal:
pick a file, post it, watch it in the admin mailbox.

## The existing architecture (verified — do not change it)

- Next.js 14 App Router, React 18, framer-motion, TypeScript, no Tailwind
  (inline styles + a warm dark "keepsake" aesthetic: browns, golds, serif
  italics — match it).
- `lib/supabase.ts` — a browser Supabase client using the **anon key**.
- `components/sections/Confessions.tsx` — the writer form. It validates
  client-side, uploads images **directly from the browser** with the anon
  client into the **public** `confession-images` bucket under UUID filenames,
  then POSTs `FormData` (`text`, `unlockDate`, `imagePaths`) to
  `/api/confessions`. It has a 60s localStorage cooldown
  (`qunoot-confession-last-submit`).
- `app/api/confessions/route.ts` — validates paths against a UUID regex,
  normalizes the unlock date, applies a per-IP in-memory 60s cooldown, converts
  paths to **public URLs** via `getPublicUrl`, and inserts
  `{ text, image_url, image_urls, unlock_date }` with the anon key.
- `app/admin/page.tsx` — client-side password gate (hardcoded constant),
  fetches the `confessions` table directly with the anon client; renders
  `LockedCard` (sealed until `unlock_date`) and `UnlockedCard`
  (text + images + mark-as-read). Both card components live inside this file.
- Migrations are plain SQL files in `supabase/migrations/` run manually in the
  Supabase SQL editor.

Security posture of this project is deliberately simple: public unguessable
URLs, anon-key access, client-side gate. The video feature should match that
posture (public R2 URL stored in the row), not add auth systems.

## One-time Cloudflare setup (user does this in the dashboard)

The user already has a Cloudflare account with R2 enabled (used by another
project). For THIS project:

1. Create a **separate bucket**, e.g. `qunoot-films`.
2. Bucket → Settings → **enable the public r2.dev development URL** (this
   project's architecture stores public URLs, and `<video>` playback of public
   URLs needs no CORS). Note the base, e.g.
   `https://pub-XXXXXXXX.r2.dev`.
3. Bucket → Settings → CORS policy (needed for the browser PUT upload):

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://THE-DEPLOYED-DOMAIN"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. Manage R2 API Tokens → create a **new token scoped to only this bucket**
   with Object Read & Write (do not reuse tokens from other projects). Copy the
   Access Key ID + Secret.
5. Env vars (`.env.local` + Vercel), server-only, no `NEXT_PUBLIC_` prefix:

   ```
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_VIDEO_BUCKET=qunoot-films
   R2_PUBLIC_BASE_URL=https://pub-XXXXXXXX.r2.dev
   ```

## Implementation

### 1. Migration — `supabase/migrations/<timestamp>_add_confession_video.sql`

```sql
alter table public.confessions
  add column if not exists video_url text;
```

### 2. New API route — `app/api/videos/sign/route.ts`

R2 has no anonymous uploads, so the browser needs a presigned PUT URL. Install
`aws4fetch` (tiny, no AWS SDK). The route:

- `export const runtime = "nodejs";`
- Applies the same per-IP in-memory cooldown pattern used in
  `app/api/confessions/route.ts` (copy that helper; it is the project's only
  abuse guard and the sign route must not be an open upload faucet).
- Body: `{ contentType }`. Allow exactly `video/mp4` → `mp4`,
  `video/quicktime` → `mov`, `video/webm` → `webm`; reject others.
- Generates `path = crypto.randomUUID() + "." + ext` and presigns:

  ```ts
  import { AwsClient } from "aws4fetch";
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  const url = new URL(
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_VIDEO_BUCKET}/${path}`,
  );
  url.searchParams.set("X-Amz-Expires", "900");
  const signed = await client.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  // return { path, uploadUrl: signed.url }
  ```

- If the `R2_*` env vars are missing, return a friendly 503 ("Films are not
  set up yet.") — the rest of the site must keep working.

### 3. Writer form — `components/sections/Confessions.tsx`

Following the form's existing style and copy tone ("tuck in photos" etc.):

- Add one optional film field under the photos section: a dashed button
  ("tuck in a film"), `<input type="file"
  accept="video/mp4,video/quicktime,video/webm" hidden>`, single file only.
- Client checks: allowed type; size ≤ 1 GB (`1024 ** 3`); friendly error
  strings matching the section's voice.
- Show the chosen filename with a remove ✕ (no size/quality details in the UI).
- On submit, before the existing FormData POST:
  1. `POST /api/videos/sign` with the file's type → `{ path, uploadUrl }`.
  2. Upload with `XMLHttpRequest` PUT (set `Content-Type` header to the file's
     type) so `xhr.upload.onprogress` can drive a percentage on the submit
     button label (files are large; progress is required UX).
  3. Append `videoPath` to the FormData.
- Keep the existing images flow untouched.

### 4. API route — `app/api/confessions/route.ts`

- Read `videoPath` from the FormData; if present validate with
  `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|mov|webm)$/i`
  (mirror of the existing image-path regex).
- Build `video_url = `${process.env.R2_PUBLIC_BASE_URL}/${videoPath}`` and
  include it in the insert. No other changes.

### 5. Admin mailbox — `app/admin/page.tsx`

- Add `video_url: string | null` to the `Confession` type.
- In `UnlockedCard`, when `video_url` is set, render below the text (styling
  consistent with the card's inline-style aesthetic):

  ```tsx
  <video controls playsInline preload="metadata"
    src={confession.video_url}
    style={{ width: "100%", maxHeight: 380, borderRadius: 8,
             background: "#000", border: "1px solid rgba(201,169,110,0.2)" }} />
  ```

- `preload="metadata"` matters: R2 egress is free but phones shouldn't
  auto-download whole films when the mailbox opens.
- `LockedCard` needs no change (sealed letters already hide everything).

## Constraints & non-goals

- One film per confession. MP4 / MOV / WebM only, 1 GB max.
- No compression, no thumbnails, no storage meters, no quality pickers — the
  user explicitly wants none of that surfaced.
- Do not migrate images/audio to R2; only video.
- Do not change the auth model of this project.

## Verification checklist

1. `npm run build` passes.
2. With `R2_*` env unset: posting a text-only confession still works; choosing
   a film and posting shows the friendly "not set up yet" error.
3. With env set: post a confession with a small test MPV/MP4 → progress
   percentage appears → row in Supabase has an `https://pub-….r2.dev/….mp4`
   `video_url` → object visible in the R2 dashboard.
4. `/admin`: the confession shows an inline player; it plays on iPhone Safari
   (MP4/MOV) and desktop Chrome.
5. A confession with a future `unlock_date` and a film stays a sealed envelope
   until the date.
6. Clean up the test row (Supabase Table Editor) and test object (R2 dashboard).
