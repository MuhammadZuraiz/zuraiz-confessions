import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import type { Confession, ConfessionRow } from "@/lib/confessions";
import { getMood, isConfessionMood, normalizeMood } from "@/lib/moods";
import { hasSession } from "@/lib/server/auth";
import { rowIsUnlocked, serializeConfession } from "@/lib/server/confession-data";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin, ServerConfigurationError } from "@/lib/server/supabase-admin";
import { normalizeUnlockDate, validUploadPath, validVideoPath } from "@/lib/server/validation";

export const runtime = "nodejs";

const submissionCooldowns = new Map<string, number>();

function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

async function listConfessions(request: Request) {
  const view = new URL(request.url).searchParams.get("view");
  const role = view === "mailbox" ? "reader" : view === "sent" ? "writer" : null;
  if (!role) return jsonError("Choose a valid post view.", 400);
  if (!(await hasSession(role))) return jsonError("Unlock your private post first.", 401);

  const supabase = getSupabaseAdmin();
  const { data: roots, error } = await supabase
    .from("confessions")
    .select("*")
    .eq("sender_role", "writer")
    .is("reply_to", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const output: Confession[] = [];
  for (const row of (roots || []) as ConfessionRow[]) {
    const readerCanSeeSealedContent =
      rowIsUnlocked(row) && (!row.unlock_date || Boolean(row.opened_at));
    output.push(
      await serializeConfession(row, {
        reveal: view === "sent" || normalizeMood(row.mood) !== "spicy",
        forceConcealed: view === "mailbox" && !readerCanSeeSealedContent,
      }),
    );
  }

  return NextResponse.json(
    { confessions: output },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: Request) {
  try {
    return await listConfessions(request);
  } catch (error) {
    const message = error instanceof ServerConfigurationError
      ? "Private storage is not configured yet."
      : "The post could not be sorted.";
    return jsonError(message, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("That request was not accepted.", 403);
  if (!(await hasSession("writer"))) return jsonError("Unlock the writing desk first.", 401);

  const now = Date.now();
  const lastSubmit = submissionCooldowns.get("writer") || 0;
  const remaining = config.submitCooldownMs - (now - lastSubmit);
  if (remaining > 0) {
    return jsonError("The post office needs a moment before your next letter.", 429, {
      retryAfter: Math.ceil(remaining / 1000),
    });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 20000) return jsonError("Write a valid letter before posting it.", 400);
  if (!isConfessionMood(body?.mood)) return jsonError("Choose a valid letter mood.", 400);

  const stationery = getMood(body.mood).defaultStationery;
  const unlockDate = normalizeUnlockDate(body?.unlockDate);
  if (unlockDate === "invalid") return jsonError("Choose a valid seal date.", 400);

  const imagePaths = Array.isArray(body?.imagePaths) ? body.imagePaths : [];
  if (
    imagePaths.length > config.maxImages ||
    imagePaths.some((path: unknown) => !validUploadPath(path, "image"))
  ) {
    return jsonError("One of the enclosed photos could not be verified.", 400);
  }
  const audioPath = body?.audioPath || null;
  if (audioPath && !validUploadPath(audioPath, "audio")) {
    return jsonError("The voice note could not be verified.", 400);
  }
  const videoPath = body?.videoPath || null;
  if (videoPath && !validVideoPath(videoPath)) {
    return jsonError("The film could not be verified.", 400);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("confessions").insert({
      text,
      image_url: null,
      image_urls: [],
      image_paths: imagePaths,
      audio_url: null,
      audio_path: audioPath,
      // Only sent when present so posting still works before upgrade-03 runs.
      ...(videoPath ? { video_path: videoPath } : {}),
      unlock_date: unlockDate,
      stationery,
      mood: body.mood,
      sender_role: "writer",
      reply_to: null,
    });
    if (error) throw error;
    submissionCooldowns.set("writer", now);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof ServerConfigurationError
      ? "Private storage is not configured yet."
      : "The letter could not be posted.";
    return jsonError(message, 503);
  }
}
