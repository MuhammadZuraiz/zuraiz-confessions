import { NextResponse } from "next/server";
import {
  clearLoginFailures,
  getLoginRateStatus,
  isAuthRole,
  passcodeMatches,
  recordLoginFailure,
  setSession,
} from "@/lib/server/auth";
import { isSameOrigin } from "@/lib/server/request-security";
import { ServerConfigurationError } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "That request was not accepted." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";
  if (!isAuthRole(role) || !passcode || passcode.length > 256) {
    return NextResponse.json({ error: "Enter a valid passcode." }, { status: 400 });
  }

  try {
    const status = await getLoginRateStatus(request, role);
    if (!status.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Let the lock rest for a while.", retryAfter: status.retryAfter },
        { status: 429 },
      );
    }

    if (!passcodeMatches(role, passcode)) {
      await recordLoginFailure(request, role);
      return NextResponse.json({ error: "That’s not the word." }, { status: 401 });
    }

    await clearLoginFailures(request, role);
    await setSession(role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof ServerConfigurationError
        ? "Private access is not configured yet."
        : "The lock could not be checked. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
