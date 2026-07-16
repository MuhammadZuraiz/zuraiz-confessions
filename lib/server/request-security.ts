import "server-only";

import { createHmac } from "node:crypto";

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const expectedOrigin = forwardedHost
    ? `${forwardedProto || "https"}://${forwardedHost}`
    : url.origin;

  return origin === expectedOrigin;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function opaqueRateLimitKey(request: Request, role: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${role}:${getClientIp(request)}`)
    .digest("hex");
}
