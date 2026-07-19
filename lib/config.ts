/** Public copy and non-secret product settings. Passcodes live only in server env vars. */
export const config = {
  siteName: "The Confession Post",
  writerName: "Zuraiz",
  readerName: "Qunoot",
  readerInitial: "Q",
  pronoun: { subject: "she", object: "her", possessive: "her" },
  submitCooldownMs: 60 * 1000,
  maxImages: 10,
  maxImageMb: 20,
  maxAudioMb: 10,
  maxAudioSeconds: 300,
  reactions: [
    { slug: "love", glyph: "\u2764\uFE0F", label: "love it" },
    { slug: "drool", glyph: "\uD83E\uDD24", label: "left me drooling" },
  ],
} as const;

export type Reaction = (typeof config.reactions)[number];

export function getReaction(slug: string | null | undefined): Reaction | null {
  return config.reactions.find((reaction) => reaction.slug === slug) ?? null;
}
