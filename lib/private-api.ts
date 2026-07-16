"use client";

import { supabase } from "@/lib/supabase";
import type { SenderRole } from "@/lib/confessions";

export class PrivateApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PrivateApiError";
    this.status = status;
  }
}

export async function privateJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PrivateApiError(result?.error || "The private post could not be reached.", response.status);
  }
  return result as T;
}

export async function uploadPrivateEnclosure(options: {
  role: SenderRole;
  kind: "image" | "audio";
  data: Blob;
  contentType: string;
  parentId?: string;
}): Promise<string> {
  const signed = await privateJson<{ bucket: string; path: string; token: string }>(
    "/api/uploads/sign",
    {
      method: "POST",
      body: JSON.stringify({
        role: options.role,
        kind: options.kind,
        contentType: options.contentType,
        parentId: options.parentId,
      }),
    },
  );

  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, options.data, {
      cacheControl: "3600",
      contentType: options.contentType,
    });
  if (error) throw new PrivateApiError("An enclosure failed to upload.", 503);
  return signed.path;
}
