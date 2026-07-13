/**
 * All person-specific copy and site settings live here.
 * Edit this one file to change names, pronouns, or the mailbox password.
 */
export const config = {
  siteName: "The Confession Post",

  /** The person who READS the letters (the /admin mailbox). */
  readerName: "Zuraiz",
  /** Initial pressed into the wax seal on sealed letters. */
  readerInitial: "Z",
  /** Pronouns used in copy addressed to the writer ("he won't see this until…"). */
  pronoun: {
    subject: "he",
    object: "him",
    possessive: "his",
  },

  /**
   * Password for the mailbox page (/admin).
   * NOTE: this is a simple client-side gate, same as the original site —
   * change it to something only the two of you know.
   */
  readerPassword: "qlovesz",

  /** Minimum time between posts, in milliseconds. */
  submitCooldownMs: 60 * 1000,

  /** Photo limits (must match supabase/setup.sql bucket settings). */
  maxImages: 10,
  maxImageMb: 10,
} as const;
