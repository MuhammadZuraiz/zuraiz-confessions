import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hasSession } from "@/lib/server/auth";
import { presignVideoUpload } from "@/lib/server/r2";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin, ServerConfigurationError } from "@/lib/server/supabase-admin";
import { uploadFormat, videoUploadFormat } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "That request was not accepted." }, { status: 403 });
  }
  if (!(await hasSession("writer"))) {
    return NextResponse.json({ error: "Unlock the writing desk first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  // The presigned R2 PUT flow is unchanged; only playback URLs are public now.
  if (body?.kind === "video") {
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
    const path = `writer/${randomUUID()}.${format.ext}`;
    const { data, error } = await getSupabaseAdmin().storage
      .from(format.bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;
    return NextResponse.json({ bucket: format.bucket, path, token: data.token });
  } catch (error) {
    const message = error instanceof ServerConfigurationError
      ? "Media storage is not configured yet."
      : "The enclosure could not be prepared.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
