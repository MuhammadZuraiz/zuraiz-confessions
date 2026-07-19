import type { ConfessionMood } from "@/lib/moods";

export type SenderRole = "writer" | "reader";

export type ConfessionRow = {
  id: string;
  text: string;
  image_url: string | null;
  image_urls: string[] | null;
  unlock_date: string | null;
  is_read: boolean;
  created_at: string;
  // Added by supabase/upgrade-01.sql — optional so the UI degrades
  // gracefully if the upgrade hasn't been run yet.
  opened_at?: string | null;
  reaction?: string | null;
  reacted_at?: string | null;
  audio_url?: string | null;
  stationery?: string | null;
  mood?: ConfessionMood | null;
  sender_role?: SenderRole | null;
  reply_to?: string | null;
  image_paths?: string[] | null;
  audio_path?: string | null;
  video_path?: string | null;
};

export type Confession = Omit<ConfessionRow, "text" | "image_urls"> & {
  text: string | null;
  image_urls: string[];
  mood: ConfessionMood;
  sender_role: SenderRole;
  reply_to: string | null;
  concealed: boolean;
  image_count: number;
  has_audio: boolean;
  video_url?: string | null;
  has_video?: boolean;
};

export function getConfessionImages(confession: Confession): string[] {
  if (Array.isArray(confession.image_urls) && confession.image_urls.length > 0) {
    return confession.image_urls;
  }
  return confession.image_url ? [confession.image_url] : [];
}

export function isSpicy(confession: Pick<Confession, "mood">): boolean {
  return confession.mood === "spicy";
}

/** A letter is readable once local midnight of its unlock date has passed. */
export function isUnlocked(confession: Confession): boolean {
  if (!confession.unlock_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unlock = new Date(confession.unlock_date + "T00:00:00");
  return today >= unlock;
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unlock = new Date(dateStr + "T00:00:00");
  return Math.ceil((unlock.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** A sealed letter whose day has arrived but that hasn't been ceremonially opened yet. */
export function needsCeremony(confession: Confession): boolean {
  return isUnlocked(confession) && !!confession.unlock_date && !confession.opened_at;
}

/**
 * If the letter was written on this day-of-month in an earlier month,
 * returns how many months ago; otherwise null.
 */
export function monthsAgoToday(confession: Confession, now = new Date()): number | null {
  const written = new Date(confession.created_at);
  if (written.getDate() !== now.getDate()) return null;
  const months =
    (now.getFullYear() - written.getFullYear()) * 12 + (now.getMonth() - written.getMonth());
  return months >= 1 ? months : null;
}

export function formatMonthsAgo(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "a year" : `${years} years`;
  }
  return months === 1 ? "a month" : `${months} months`;
}

export function formatLongDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
