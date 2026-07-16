import { NextResponse } from "next/server";
import type { ConfessionRow } from "@/lib/confessions";
import { hasSession } from "@/lib/server/auth";
import { rowIsUnlocked } from "@/lib/server/confession-data";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isUuid, validUploadPath, wordCount } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "That request was not accepted." }, { status: 403 });
  }
  if (!(await hasSession("reader"))) {
    return NextResponse.json({ error: "Unlock the mailbox first." }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid letter." }, { status: 400 });
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || wordCount(text) > 120) {
    return NextResponse.json({ error: "Keep the return note between 1 and 120 words." }, { status: 400 });
  }

  const imagePaths = Array.isArray(body?.imagePaths) ? body.imagePaths : [];
  const audioPath = body?.audioPath || null;
  if (imagePaths.length > 1 || (imagePaths.length > 0 && audioPath)) {
    return NextResponse.json({ error: "Enclose either one photo or one voice note." }, { status: 400 });
  }
  if (imagePaths.some((path: unknown) => !validUploadPath(path, "reader", "image", id))) {
    return NextResponse.json({ error: "The return photo could not be verified." }, { status: 400 });
  }
  if (audioPath && !validUploadPath(audioPath, "reader", "audio", id)) {
    return NextResponse.json({ error: "The return voice note could not be verified." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: parent, error } = await supabase
    .from("confessions")
    .select("*")
    .eq("id", id)
    .eq("sender_role", "writer")
    .is("reply_to", null)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "The letter could not be checked." }, { status: 503 });
  if (!parent) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  if (!rowIsUnlocked(parent as ConfessionRow)) {
    return NextResponse.json({ error: "That letter is still sealed." }, { status: 423 });
  }

  const { error: insertError } = await supabase.from("confessions").insert({
    text,
    image_url: null,
    image_urls: [],
    image_paths: imagePaths,
    audio_url: null,
    audio_path: audioPath,
    unlock_date: null,
    stationery: parent.stationery || "cream",
    mood: parent.mood || "tender",
    sender_role: "reader",
    reply_to: id,
  });

  if (insertError?.code === "23505") {
    return NextResponse.json({ error: "A return note has already been sent." }, { status: 409 });
  }
  if (insertError) return NextResponse.json({ error: "The return note could not be sent." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
