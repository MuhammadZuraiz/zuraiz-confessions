export type Confession = {
  id: string;
  text: string;
  image_url: string | null;
  image_urls: string[] | null;
  unlock_date: string | null;
  is_read: boolean;
  created_at: string;
};

export function getConfessionImages(confession: Confession): string[] {
  if (Array.isArray(confession.image_urls) && confession.image_urls.length > 0) {
    return confession.image_urls;
  }
  return confession.image_url ? [confession.image_url] : [];
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

export function formatLongDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
