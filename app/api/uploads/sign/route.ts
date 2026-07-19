import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hasSession, isAuthRole } from "@/lib/server/auth";
import { rowIsUnlocked } from "@/lib/server/confession-data";
import { presignVideoUpload } from "@/lib/server/r2";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin, ServerConfigurationError } from "@/lib/server/supabase-admin";
import { isUuid, uploadFormat, videoUploadFormat } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "That request was not accepted." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (!isAuthRole(role) || !(await hasSession(role))) {
    return NextResponse.json({ error: "Unlock your private post first." }, { status: 401 });
  }

  // Films: writer-only, stored in the private R2 bucket via a presigned PUT.
  if (body?.kind === "video") {
    if (role !== "writer") {
      return NextResponse.json({ error: "Only the writing desk can enclose films." }, { status: 403 });
    }
    const videoFormat = videoUploadFormat(body?.contentType);
    if (!videoFormat) {
      return NextResponse.json({ error: "That film format is not supported." }, { status: 400 });
    }
    try {
      const path = `writer/${randomUUID()}.${videoFormat.ext}`;
      const uploadUrl = await presignVideoUpload(path);
      return NextResponse.json({ provider: "r2", path, uploadUrl });
    } catch (error) {
      const message = error instanceof ServerConfigurationError
        ? "Film storage is not configured yet."
        : "The film could not be prepared.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  const format = uploadFormat(body?.kind, body?.contentType);
  if (!format) {
    return NextResponse.json({ error: "That enclosure type is not supported." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    let prefix = "writer";

    if (role === "reader") {
      if (!isUuid(body?.parentId)) {
        return NextResponse.json({ error: "Choose a valid letter to answer." }, { status: 400 });
      }
      const { data: parent, error } = await supabase
        .from("confessions")
        .select("id, unlock_date, sender_role, reply_to")
        .eq("id", body.parentId)
        .maybeSingle();
      if (error) throw error;
      if (!parent || parent.sender_role !== "writer" || parent.reply_to || !rowIsUnlocked(parent)) {
        return NextResponse.json({ error: "That letter cannot receive return post." }, { status: 409 });
      }
      prefix = `reader/${body.parentId}`;
    }

    const path = `${prefix}/${randomUUID()}.${format.ext}`;
    const { data, error } = await supabase.storage
      .from(format.bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;

    return NextResponse.json({ bucket: format.bucket, path, token: data.token });
  } catch (error) {
    const message = error instanceof ServerConfigurationError
      ? "Private storage is not configured yet."
      : "The enclosure could not be prepared.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
