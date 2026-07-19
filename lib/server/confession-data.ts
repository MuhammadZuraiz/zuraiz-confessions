import "server-only";

import type { Confession, ConfessionRow, SenderRole } from "@/lib/confessions";
import { isConfessionMood } from "@/lib/moods";
import { isR2Configured, presignVideoDownload } from "@/lib/server/r2";
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

  const legacy =
    Array.isArray(row.image_urls) && row.image_urls.length > 0
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

async function signPath(bucket: string, path: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 5 * 60);
  return error ? null : data.signedUrl;
}

export async function serializeConfession(
  row: ConfessionRow,
  options: {
    reveal?: boolean;
    forceConcealed?: boolean;
    hasReply?: boolean;
    reply?: Confession | null;
  } = {},
): Promise<Confession> {
  const mood = isConfessionMood(row.mood) ? row.mood : "tender";
  const senderRole: SenderRole = row.sender_role === "reader" ? "reader" : "writer";
  const imagePaths = imagePathsFor(row);
  const audioPath = audioPathFor(row);
  const concealed = options.forceConcealed || (mood === "after-dark" && !options.reveal);

  const signedImages = concealed
    ? []
    : (await Promise.all(imagePaths.map((path) => signPath("confession-images", path)))).filter(
        (url): url is string => Boolean(url),
      );
  const signedAudio = concealed || !audioPath
    ? null
    : await signPath("confession-audio", audioPath);

  let signedVideo: string | null = null;
  if (!concealed && row.video_path && isR2Configured()) {
    signedVideo = await presignVideoDownload(row.video_path).catch(() => null);
  }

  return {
    id: row.id,
    text: concealed ? null : row.text,
    image_url: signedImages[0] || null,
    image_urls: signedImages,
    unlock_date: row.unlock_date,
    is_read: row.is_read,
    created_at: row.created_at,
    opened_at: row.opened_at || null,
    reaction: row.reaction || null,
    reacted_at: row.reacted_at || null,
    audio_url: signedAudio,
    stationery: row.stationery || "cream",
    mood,
    sender_role: senderRole,
    reply_to: row.reply_to || null,
    concealed: Boolean(concealed),
    image_count: imagePaths.length,
    has_audio: Boolean(audioPath),
    video_url: signedVideo,
    has_video: Boolean(row.video_path),
    has_reply: options.hasReply,
    reply: options.reply,
  };
}

export function rowIsUnlocked(row: Pick<ConfessionRow, "unlock_date">): boolean {
  if (!row.unlock_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unlock = new Date(`${row.unlock_date}T00:00:00`);
  return today >= unlock;
}
