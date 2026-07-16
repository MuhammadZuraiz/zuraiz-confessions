import { NextResponse } from "next/server";
import { hasSession, isAuthRole } from "@/lib/server/auth";
import { ServerConfigurationError } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const role = new URL(request.url).searchParams.get("role");
  if (!isAuthRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      { authenticated: await hasSession(role) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof ServerConfigurationError
        ? "Private access is not configured yet."
        : "The session could not be checked.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
