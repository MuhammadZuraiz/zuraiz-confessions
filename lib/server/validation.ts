import "server-only";

import type { AuthRole } from "@/lib/server/auth";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const IMAGE_EXT = "(?:jpg|png|webp)";
const AUDIO_EXT = "(?:webm|m4a|mp3|ogg)";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^${UUID}$`, "i").test(value);
}

export function validUploadPath(
  value: unknown,
  role: AuthRole,
  kind: "image" | "audio",
  parentId?: string,
): value is string {
  if (typeof value !== "string") return false;
  const extension = kind === "image" ? IMAGE_EXT : AUDIO_EXT;
  const prefix = role === "writer" ? "writer" : `reader/${parentId || "missing"}`;
  return new RegExp(`^${prefix}/${UUID}\\.${extension}$`, "i").test(value);
}

export function normalizeUnlockDate(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "invalid";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? value
    : "invalid";
}

export function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function uploadFormat(kind: unknown, contentType: unknown) {
  if (kind === "image" && contentType === "image/webp") {
    return { kind: "image" as const, bucket: "confession-images", ext: "webp" };
  }
  if (kind === "audio" && contentType === "audio/webm") {
    return { kind: "audio" as const, bucket: "confession-audio", ext: "webm" };
  }
  if (kind === "audio" && contentType === "audio/mp4") {
    return { kind: "audio" as const, bucket: "confession-audio", ext: "m4a" };
  }
  return null;
}
