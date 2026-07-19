import "server-only";

import { AwsClient } from "aws4fetch";
import { ServerConfigurationError } from "@/lib/server/supabase-admin";

const PUT_EXPIRES_SECONDS = 15 * 60;

function r2UploadConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_VIDEO_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new ServerConfigurationError(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_VIDEO_BUCKET must be configured.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** Short-lived URL the browser PUTs the video file to. */
export async function presignVideoUpload(path: string): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucket } = r2UploadConfig();
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const url = new URL(
    `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
  );
  url.searchParams.set("X-Amz-Expires", String(PUT_EXPIRES_SECONDS));
  const signed = await client.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/** Stable playback URL from the bucket's enabled public r2.dev domain. */
export function videoPublicUrl(path: string): string {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new ServerConfigurationError("R2_PUBLIC_BASE_URL must be configured.");
  }
  return `${baseUrl}/${path}`;
}
