import "server-only";

import { AwsClient } from "aws4fetch";
import { ServerConfigurationError } from "@/lib/server/supabase-admin";

const PUT_EXPIRES_SECONDS = 15 * 60;
const GET_EXPIRES_SECONDS = 6 * 60 * 60;

function r2Config() {
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

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_VIDEO_BUCKET,
  );
}

async function presign(method: "GET" | "PUT", path: string, expires: number): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucket } = r2Config();
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });

  const url = new URL(
    `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
  );
  url.searchParams.set("X-Amz-Expires", String(expires));

  const signed = await client.sign(new Request(url, { method }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/** Short-lived URL the browser PUTs the video file to. */
export function presignVideoUpload(path: string): Promise<string> {
  return presign("PUT", path, PUT_EXPIRES_SECONDS);
}

/** Playback URL, long enough for an evening of rewatching. */
export function presignVideoDownload(path: string): Promise<string> {
  return presign("GET", path, GET_EXPIRES_SECONDS);
}
