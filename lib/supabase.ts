import { createClient } from "@supabase/supabase-js";

// Falls back to placeholders so the UI still renders before Supabase is
// configured; every network call will fail cleanly until .env.local is set.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
);
