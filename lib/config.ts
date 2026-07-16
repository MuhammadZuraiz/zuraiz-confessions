/**
 * All person-specific copy and site settings live here.
 * Edit this one file to change names, pronouns, or the mailbox password.
 */
export const config = {
  siteName: "The Confession Post",

  /** The person who WRITES the letters and owns the /sent ledger. */
  writerName: "Zuraiz",

  /** The person who READS the letters (the /admin mailbox). */
  readerName: "Qunoot",
  /** Initial pressed into the wax seal on sealed letters. */
  readerInitial: "Q",
  /** Pronouns used in copy addressed to the writer ("she won't see this until…"). */
  pronoun: {
    subject: "she",
    object: "her",
    possessive: "her",
  },

  /**
   * Password for the mailbox page (/admin).
   * NOTE: this is a simple client-side gate, same as the original site —
   * change it to something only the two of you know.
   */
  readerPassword: "qlovesz",

  /**
   * Password for the writer's ledger page (/sent) — read receipts and
   * reactions. Change it to something of your own.
   */
  writerPassword: "zlovesq",

  /** Minimum time between posts, in milliseconds. */
  submitCooldownMs: 60 * 1000,

  /** Photo limits (must match supabase/setup.sql bucket settings). */
  maxImages: 10,
  maxImageMb: 10,

  /** Voice-note limits (must match supabase/upgrade-01.sql bucket settings). */
  maxAudioMb: 10,
  maxAudioSeconds: 300,

  /** Wax-seal reactions the reader can press onto a letter. */
  reactions: [
    { slug: "love", glyph: "❤️", label: "love it" },
    { slug: "cried", glyph: "🥹", label: "made me cry" },
    { slug: "read-twice", glyph: "🔁", label: "read it twice" },
    { slug: "smiled", glyph: "☺️", label: "made me smile" },
  ],
} as const;

export type Reaction = (typeof config.reactions)[number];

export function getReaction(slug: string | null | undefined): Reaction | null {
  return config.reactions.find((r) => r.slug === slug) ?? null;
}
