import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import type { Confession, ConfessionRow } from "@/lib/confessions";
import { normalizeMood } from "@/lib/moods";
import { hasSession } from "@/lib/server/auth";
import { rowIsUnlocked, serializeConfession } from "@/lib/server/confession-data";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isUuid } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function PATCH(
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

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("confessions")
    .select("*")
    .eq("id", id)
    .eq("sender_role", "writer")
    .is("reply_to", null)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "The letter could not be checked." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Letter not found." }, { status: 404 });

  const row = data as ConfessionRow;
  if (!rowIsUnlocked(row)) {
    return NextResponse.json({ error: "That letter is still sealed." }, { status: 423 });
  }

  let patch: Record<string, unknown>;
  if (body?.action === "open") {
    patch = { opened_at: row.opened_at || new Date().toISOString() };
  } else if (body?.action === "mark-read") {
    patch = { is_read: true };
  } else if (
    body?.action === "reaction" &&
    config.reactions.some((reaction) => reaction.slug === body?.reaction)
  ) {
    patch = { reaction: body.reaction, reacted_at: new Date().toISOString(), is_read: true };
  } else {
    return NextResponse.json({ error: "Invalid letter action." }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("confessions").update(patch).eq("id", id);
  if (updateError) return NextResponse.json({ error: "The letter could not be updated." }, { status: 503 });

  let confession: Confession | undefined;
  if (body?.action === "open" && normalizeMood(row.mood) !== "spicy") {
    confession = await serializeConfession({ ...row, ...patch }, { reveal: true });
  }
  return NextResponse.json({ ok: true, patch, confession });
}
