import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { SenderRole } from "@/lib/confessions";
import { getSupabaseAdmin, ServerConfigurationError } from "@/lib/server/supabase-admin";
import { opaqueRateLimitKey } from "@/lib/server/request-security";

export type AuthRole = SenderRole;

const SESSION_SECONDS = 30 * 24 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function sessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new ServerConfigurationError("SESSION_SECRET must contain at least 32 characters.");
  }
  return value;
}

function cookieName(role: AuthRole): string {
  return `confession_${role}_session`;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function createSessionToken(role: AuthRole): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${role}.${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string | undefined, role: AuthRole): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1" || parts[1] !== role) return false;

  const payload = parts.slice(0, 4).join(".");
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(parts[4]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  const expiresAt = Number(parts[2]);
  return Number.isFinite(expiresAt) && expiresAt > Math.floor(Date.now() / 1000);
}

export function isAuthRole(value: unknown): value is AuthRole {
  return value === "writer" || value === "reader";
}

export async function hasSession(role: AuthRole): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(cookieName(role))?.value, role);
}

export async function requireSession(role: AuthRole): Promise<void> {
  if (!(await hasSession(role))) throw new Response("Unauthorized", { status: 401 });
}

export async function setSession(role: AuthRole): Promise<void> {
  const store = await cookies();
  store.set(cookieName(role), createSessionToken(role), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession(role: AuthRole): Promise<void> {
  const store = await cookies();
  store.set(cookieName(role), "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function passcodeMatches(role: AuthRole, candidate: string): boolean {
  const expectedValue =
    role === "writer" ? process.env.WRITER_PASSCODE : process.env.READER_PASSCODE;
  if (!expectedValue) {
    throw new ServerConfigurationError(
      `${role === "writer" ? "WRITER_PASSCODE" : "READER_PASSCODE"} is not configured.`,
    );
  }

  const expected = createHash("sha256").update(expectedValue).digest();
  const received = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, received);
}

type RateStatus = { allowed: true } | { allowed: false; retryAfter: number };

export async function getLoginRateStatus(
  request: Request,
  role: AuthRole,
): Promise<RateStatus> {
  const supabase = getSupabaseAdmin();
  const key = opaqueRateLimitKey(request, role, sessionSecret());
  const { data, error } = await supabase
    .from("auth_rate_limits")
    .select("attempts, window_started_at, blocked_until")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  if (!data?.blocked_until) return { allowed: true };

  const remaining = new Date(data.blocked_until).getTime() - Date.now();
  return remaining > 0
    ? { allowed: false, retryAfter: Math.ceil(remaining / 1000) }
    : { allowed: true };
}

export async function recordLoginFailure(request: Request, role: AuthRole): Promise<void> {
  const supabase = getSupabaseAdmin();
  const key = opaqueRateLimitKey(request, role, sessionSecret());
  const now = new Date();
  const { data, error } = await supabase
    .from("auth_rate_limits")
    .select("attempts, window_started_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;

  const windowStarted = data?.window_started_at
    ? new Date(data.window_started_at).getTime()
    : 0;
  const withinWindow = now.getTime() - windowStarted < LOGIN_WINDOW_MS;
  const attempts = withinWindow ? Number(data?.attempts || 0) + 1 : 1;
  const blockedUntil =
    attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + LOGIN_WINDOW_MS).toISOString()
      : null;

  const { error: upsertError } = await supabase.from("auth_rate_limits").upsert({
    key,
    attempts,
    window_started_at: withinWindow && data?.window_started_at
      ? data.window_started_at
      : now.toISOString(),
    blocked_until: blockedUntil,
    updated_at: now.toISOString(),
  });
  if (upsertError) throw upsertError;
}

export async function clearLoginFailures(request: Request, role: AuthRole): Promise<void> {
  const supabase = getSupabaseAdmin();
  const key = opaqueRateLimitKey(request, role, sessionSecret());
  const { error } = await supabase.from("auth_rate_limits").delete().eq("key", key);
  if (error) throw error;
}
