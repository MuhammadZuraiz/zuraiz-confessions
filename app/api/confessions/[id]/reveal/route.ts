import { NextResponse } from "next/server";
import type { AuthRole } from "@/lib/server/auth";
import { hasSession, isAuthRole } from "@/lib/server/auth";
import type { ConfessionRow } from "@/lib/confessions";
import { rowIsUnlocked, serializeConfession } from "@/lib/server/confession-data";
import { isSameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isUuid } from "@/lib/server/validation";

export const runtime = "nodejs";

function canReveal(role: AuthRole, row: ConfessionRow): boolean {
  if (role === "reader") return row.sender_role !== "reader" && !row.reply_to;
  return row.sender_role === "writer" || row.sender_role === "reader";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "That request was not accepted." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!isAuthRole(body?.role) || !(await hasSession(body.role))) {
    return NextResponse.json({ error: "Unlock your private post first." }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid letter." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("confessions").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "The letter could not be checked." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Letter not found." }, { status: 404 });

  let row = data as ConfessionRow;
  if (!canReveal(body.role, row)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (body.role === "reader" && !rowIsUnlocked(row)) {
    return NextResponse.json({ error: "That letter is still sealed." }, { status: 423 });
  }

  const isRecipient =
    (body.role === "reader" && row.sender_role !== "reader") ||
    (body.role === "writer" && row.sender_role === "reader");
  if (isRecipient && !row.is_read) {
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
