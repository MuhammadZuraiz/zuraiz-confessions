import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

const IMAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const submissionCooldowns = new Map<string, number>();

function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

function getRateKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

function getCooldownSeconds(rateKey: string) {
  const now = Date.now();

  if (submissionCooldowns.size > 500) {
    for (const [key, timestamp] of submissionCooldowns) {
      if (now - timestamp > config.submitCooldownMs) submissionCooldowns.delete(key);
    }
  }

  const lastSubmit = submissionCooldowns.get(rateKey) || 0;
  const remaining = config.submitCooldownMs - (now - lastSubmit);
  return Math.max(0, Math.ceil(remaining / 1000));
}

function normalizeUnlockDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const date = value.trim();
  if (!date) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "invalid";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "invalid";
  }

  return date;
}

export async function POST(request: Request) {
  const rateKey = getRateKey(request);
  const cooldownSeconds = getCooldownSeconds(rateKey);
  if (cooldownSeconds > 0) {
    return jsonError(
      `The post office needs ${cooldownSeconds}s before your next letter.`,
      429,
      { retryAfter: cooldownSeconds },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError("The post office isn't configured yet.", 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("That letter couldn't be read. Please try again.", 400);
  }

  const textValue = formData.get("text");
  const text = typeof textValue === "string" ? textValue.trim() : "";
  if (!text) {
    return jsonError("Write something before you post it.", 400);
  }

  const unlockDate = normalizeUnlockDate(formData.get("unlockDate"));
  if (unlockDate === "invalid") {
    return jsonError("Please choose a valid seal date.", 400);
  }

  const imagePathValues = formData.getAll("imagePaths");
  if (imagePathValues.length > config.maxImages) {
    return jsonError(`Please enclose up to ${config.maxImages} photos.`, 400);
  }

  const imagePaths = imagePathValues.filter((value): value is string => typeof value === "string");
  if (
    imagePaths.length !== imagePathValues.length ||
    imagePaths.some((path) => !IMAGE_PATH_PATTERN.test(path))
  ) {
    return jsonError("One of the enclosed photos couldn't be verified.", 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const image_urls = imagePaths.map((path) => {
    const { data } = supabase.storage.from("confession-images").getPublicUrl(path);
    return data.publicUrl;
  });
  const image_url = image_urls[0] || null;

  const { error: insertError } = await supabase.from("confessions").insert([
    {
      text,
      image_url,
      image_urls,
      unlock_date: unlockDate,
    },
  ]);

  if (insertError) {
    return jsonError("Something went wrong. Please try again.", 502);
  }

  submissionCooldowns.set(rateKey, Date.now());
  return NextResponse.json({ ok: true });
}
