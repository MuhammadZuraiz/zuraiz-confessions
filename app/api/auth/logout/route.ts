import { NextResponse } from "next/server";
import { clearSession, isAuthRole } from "@/lib/server/auth";
import { isSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "That request was not accepted." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!isAuthRole(body?.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  await clearSession(body.role);
  return NextResponse.json({ ok: true });
}
