"use client";

/** Re-encodes at the decoded pixel dimensions, removing EXIF and location metadata. */
export async function makePrivatePhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Please choose a JPG, PNG, or WebP photo.");
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (!bitmap.width || !bitmap.height) throw new Error("The photo has no readable dimensions.");

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Private photo processing is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.94),
    );
    if (!blob || blob.type !== "image/webp") {
      throw new Error("The photo could not be privately re-encoded.");
    }
    return new File([blob], `${crypto.randomUUID()}.webp`, { type: "image/webp" });
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("The photo could not be privately re-encoded.");
  } finally {
    bitmap?.close();
  }
}
