# The Confession Post ✉

A private post office for Zuraiz and Qunoot. Zuraiz writes letters with optional photos, voice notes, stationery, and a seal date. Qunoot opens them from her mailbox, marks them read, and can press a reaction seal. Zuraiz has a separate sent ledger with delivery and read history.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Zuraiz's writing desk — compose and post a letter |
| `/admin` | Qunoot's passcode-gated mailbox |
| `/sent` | Zuraiz's passcode-gated sent ledger and read receipts |

## One-time setup

### 1. Create the Supabase project

1. Go to [Supabase](https://supabase.com) and create a project.
2. Open **SQL Editor**, paste all of [`supabase/setup.sql`](supabase/setup.sql), and run it.
3. Then paste all of [`supabase/upgrade-01.sql`](supabase/upgrade-01.sql), and run it.

Both scripts are idempotent, so it is safe to run them again. `setup.sql` creates the original table and photo bucket. `upgrade-01.sql` adds opening history, reactions, stationery, voice notes, and the audio bucket.

If this site was already working before Upgrade 01, only the third step is new: run `upgrade-01.sql` once before using the upgraded app.

### 2. Connect the app

1. Copy `.env.example` to `.env.local`.
2. In **Supabase → Project Settings → API**, copy:
   - **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** into `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never commit `.env.local`. It is already covered by `.gitignore`.

### 3. Choose both passcodes

Open [`lib/config.ts`](lib/config.ts) and change:

- `readerPassword`: Qunoot's password for `/admin`
- `writerPassword`: Zuraiz's password for `/sent`

Names, pronouns, reaction choices, upload limits, and recording length also live in that file.

> These are lightweight client-side privacy gates. They keep the private pages away from casual visitors, but their values are included in the browser's JavaScript. Use unique romantic passphrases, never passwords used for email, banking, or other accounts.

## Run locally

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000` to write
- `http://localhost:3000/admin` for Qunoot's mailbox
- `http://localhost:3000/sent` for Zuraiz's ledger

For a production check:

```bash
npm run build
```

## Upgrade 01 features

- **Unseal ceremony:** a dated letter stays in its envelope until Qunoot breaks the wax seal. The first opening is saved in `opened_at`.
- **Reaction seals:** Qunoot can choose or change a wax-seal reaction. It is saved with a timestamp and appears in `/sent`.
- **Sent ledger:** Zuraiz can see delivery, opening, reading, reaction, stationery, photo count, and voice-note status.
- **Voice notes:** supported browsers can record up to 5 minutes, with a 10 MB storage limit. The browser will ask for microphone permission. If recording is unsupported, the control is hidden; photos and text still work normally.
- **On this day:** older letters written on the same calendar day can resurface in the mailbox without exposing still-sealed text.
- **Stationery:** cream, dusty rose, and midnight paper themes are saved per letter.
- **Reader conveniences:** full-size photo lightbox, seven-day local draft autosave, and remembered mailbox/ledger access with explicit lock links.
- **Installable app:** the manifest and wax-seal icons allow the deployed HTTPS site to be added to a phone's home screen.

## Install on a phone

Installability should be checked on the deployed HTTPS URL, not only on localhost.

### iPhone or iPad

1. Open the deployed site in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**, then **Add**.

### Android

1. Open the deployed site in Chrome.
2. Open the browser menu.
3. Choose **Install app** or **Add to Home screen**.

This upgrade intentionally has no offline mode. Posting, reading, audio, and reactions still require an internet connection.

## How sealing works

A future-dated letter appears as a closed envelope with a countdown. From local midnight on its seal date, it becomes ready for Qunoot to open. Breaking the seal records the first-open time; after that, the normal letter remains visible on reload.

## Deploy with Vercel

1. Push the repository to a private GitHub repository.
2. Import it into Vercel as a Next.js project.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel's environment variables before deploying.
4. Deploy, then test `/`, `/admin`, `/sent`, voice playback, reactions, and phone installation on the HTTPS URL.

Every later push to the production branch will trigger a new deployment.
