import { NextResponse } from "next/server";
import { hasSession } from "@/lib/server/auth";
import type { ConfessionRow } from "@/lib/confessions";
import { rowIsUnlocked, serializeConfession } from "@/lib/server/confession-data";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isUuid } from "@/lib/server/validation";

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

  let row = data as ConfessionRow;
  if (!rowIsUnlocked(row)) {
    return NextResponse.json({ error: "That letter is still sealed." }, { status: 423 });
  }
  if (!row.is_read) {
    const { error: updateError } = await supabase
      .from("confessions")
      .update({ is_read: true })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: "The letter could not be opened." }, { status: 503 });
    row = { ...row, is_read: true };
  }

  return NextResponse.json(
    { confession: await serializeConfession(row, { reveal: true }) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
