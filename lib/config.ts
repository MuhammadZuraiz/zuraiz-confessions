/** Public copy and non-secret product settings. Passcodes live only in server env vars. */
export const config = {
  siteName: "The Confession Post",
  writerName: "Zuraiz",
  readerName: "Qunoot",
  readerInitial: "Q",
  pronoun: { subject: "she", object: "her", possessive: "her" },
  submitCooldownMs: 60 * 1000,
  maxImages: 10,
  maxImageMb: 10,
  maxAudioMb: 10,
  maxAudioSeconds: 300,
  reactions: [
    { slug: "love", glyph: "\u2764\uFE0F", label: "love it" },
    { slug: "cried", glyph: "\uD83E\uDD79", label: "made me cry" },
    { slug: "read-twice", glyph: "\uD83D\uDD01", label: "read it twice" },
    { slug: "smiled", glyph: "\u263A\uFE0F", label: "made me smile" },
    { slug: "blush", glyph: "\u2726", label: "you made me blush" },
    { slug: "closer", glyph: "\u2192", label: "come closer" },
    { slug: "your-turn", glyph: "\u21BA", label: "your turn" },
  ],
} as const;

export type Reaction = (typeof config.reactions)[number];

export function getReaction(slug: string | null | undefined): Reaction | null {
  return config.reactions.find((reaction) => reaction.slug === slug) ?? null;
}
