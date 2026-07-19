export const MOODS = [
  {
    id: "flirty",
    label: "Flirty",
    description: "Playful mail with a little heat.",
    defaultStationery: "rose",
  },
  {
    id: "spicy",
    label: "Spicy",
    description: "Private correspondence, opened deliberately.",
    defaultStationery: "midnight",
  },
] as const;

export type ConfessionMood = (typeof MOODS)[number]["id"];

export function isConfessionMood(value: unknown): value is ConfessionMood {
  return MOODS.some((mood) => mood.id === value);
}

export function normalizeMood(value: unknown): ConfessionMood {
  return value === "spicy" ? "spicy" : "flirty";
}

export function getMood(value: unknown) {
  const normalized = normalizeMood(value);
  return MOODS.find((mood) => mood.id === normalized) ?? MOODS[0];
}
