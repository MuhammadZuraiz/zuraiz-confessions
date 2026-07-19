import "server-only";

import type { Confession, ConfessionRow, SenderRole } from "@/lib/confessions";
import { getMood, normalizeMood } from "@/lib/moods";
import { videoPublicUrl } from "@/lib/server/r2";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

function parsePublicPath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  try {
    return decodeURIComponent(url.slice(index + marker.length));
  } catch {
    return url.slice(index + marker.length);
  }
}

export function imagePathsFor(row: ConfessionRow): string[] {
  if (Array.isArray(row.image_paths) && row.image_paths.length > 0) {
    return row.image_paths.filter(Boolean);
  }
  const legacy = Array.isArray(row.image_urls) && row.image_urls.length > 0
    ? row.image_urls
    : row.image_url
      ? [row.image_url]
      : [];
  return legacy
    .map((url) => parsePublicPath(url, "confession-images"))
    .filter((path): path is string => Boolean(path));
}

export function audioPathFor(row: ConfessionRow): string | null {
  return row.audio_path || parsePublicPath(row.audio_url, "confession-audio");
}

function publicStorageUrl(bucket: string, path: string): string {
  return getSupabaseAdmin().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function serializeConfession(
  row: ConfessionRow,
  options: { reveal?: boolean; forceConcealed?: boolean } = {},
): Promise<Confession> {
  const mood = normalizeMood(row.mood);
  const senderRole: SenderRole = row.sender_role === "reader" ? "reader" : "writer";
  const imagePaths = imagePathsFor(row);
  const audioPath = audioPathFor(row);
  const concealed = options.forceConcealed || (mood === "spicy" && !options.reveal);

  const imageUrls = concealed
    ? []
    : imagePaths.map((path) => publicStorageUrl("confession-images", path));
  const audioUrl = concealed || !audioPath
    ? null
    : publicStorageUrl("confession-audio", audioPath);
  const videoUrl = concealed || !row.video_path
    ? null
    : (() => {
        try {
          return videoPublicUrl(row.video_path!);
        } catch {
          return null;
        }
      })();

  return {
    id: row.id,
    text: concealed ? null : row.text,
    image_url: imageUrls[0] || null,
    image_urls: imageUrls,
    unlock_date: row.unlock_date,
    is_read: row.is_read,
    created_at: row.created_at,
    opened_at: row.opened_at || null,
    reaction: row.reaction || null,
    reacted_at: row.reacted_at || null,
    audio_url: audioUrl,
    stationery: getMood(mood).defaultStationery,
    mood,
    sender_role: senderRole,
    reply_to: row.reply_to || null,
    concealed: Boolean(concealed),
    image_count: imagePaths.length,
    has_audio: Boolean(audioPath),
    video_url: videoUrl,
    has_video: Boolean(row.video_path),
  };
}

export function rowIsUnlocked(row: Pick<ConfessionRow, "unlock_date">): boolean {
  if (!row.unlock_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unlock = new Date(`${row.unlock_date}T00:00:00`);
  return today >= unlock;
}
