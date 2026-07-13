# The Confession Post ✉

A private confessions website for two people. One of you writes letters —
text, optional photos, and an optional **seal date** that keeps the letter
locked until the day arrives. The other opens the mailbox at `/admin` with a
passcode and reads them.

## Pages

| Route    | What it is |
| -------- | ---------- |
| `/`      | The writing desk — compose and post a confession |
| `/admin` | The mailbox — passcode-gated reader with sealed/unsealed letters |

## One-time setup

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (any name, any region).
2. Once it's ready, open **SQL Editor**, paste the whole contents of
   [`supabase/setup.sql`](supabase/setup.sql), and click **Run**.
   This creates the `confessions` table, its access policies, and the
   `confession-images` storage bucket. It's safe to run more than once.

### 2. Point the app at it

1. Copy `.env.example` to `.env.local`.
2. In Supabase go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Pick your passcode

Open [`lib/config.ts`](lib/config.ts) and change `readerPassword` to something
only the two of you know. Names, pronouns, and limits live in the same file.

> Note: the passcode is a simple client-side gate (same as the original
> site) — it keeps the mailbox private from casual visitors, not from a
> determined technical person.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 to write, and http://localhost:3000/admin to read.

## How sealing works

A letter with a seal date shows up in the mailbox as a closed envelope with a
wax seal and a countdown. From local midnight of the seal date onward it opens
into a readable letter. Letters without a seal date are readable immediately.
