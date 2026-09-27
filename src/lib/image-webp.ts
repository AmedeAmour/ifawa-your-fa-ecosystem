/** Re-encode photos before upload; removes EXIF metadata and bounds pixel dimensions. */
export async function photoToWebP(file: File, maxEdge = 2048): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("Choisissez une photo JPG, PNG ou WebP de moins de 20 Mo.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Cette photo ne peut pas être lue. Choisissez une autre image.");
  });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 100_000_000)
      throw new Error("Les dimensions de cette photo sont trop grandes.");
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Votre navigateur ne peut pas préparer cette photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => {
          if (value?.type === "image/webp") resolve(value);
          else reject(new Error("La conversion WebP n’est pas disponible dans ce navigateur."));
        },
        "image/webp",
        0.84,
      ),
    );
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Cette photo reste trop volumineuse après optimisation.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
