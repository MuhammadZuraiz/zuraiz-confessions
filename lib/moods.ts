export const MOODS = [
  {
    id: "tender",
    label: "Tender",
    description: "Soft, sincere, and close to the heart.",
    defaultStationery: "cream",
  },
  {
    id: "flirty",
    label: "Flirty",
    description: "Playful mail with a little more heat.",
    defaultStationery: "rose",
  },
  {
    id: "after-dark",
    label: "After Dark",
    description: "Private correspondence, opened deliberately.",
    defaultStationery: "midnight",
  },
] as const;

export type ConfessionMood = (typeof MOODS)[number]["id"];

export function isConfessionMood(value: unknown): value is ConfessionMood {
  return MOODS.some((mood) => mood.id === value);
}

export function getMood(value: string | null | undefined) {
  return MOODS.find((mood) => mood.id === value) ?? MOODS[0];
}
