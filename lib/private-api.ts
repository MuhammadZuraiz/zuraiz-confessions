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

/**
 * Uploads a film straight to the private R2 bucket via a presigned PUT.
 * Uses XHR so large files can report progress.
 */
export async function uploadFilm(options: {
  file: File;
  contentType: string;
  onProgress?: (percent: number) => void;
}): Promise<string> {
  const signed = await privateJson<{ path: string; uploadUrl: string }>("/api/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ role: "writer", kind: "video", contentType: options.contentType }),
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.uploadUrl);
    xhr.setRequestHeader("Content-Type", options.contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new PrivateApiError("The film failed to upload.", xhr.status || 503));
    xhr.onerror = () => reject(new PrivateApiError("The film failed to upload.", 503));
    xhr.send(options.file);
  });

  return signed.path;
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
