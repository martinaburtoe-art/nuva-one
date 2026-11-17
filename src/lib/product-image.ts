import { supabase } from "@/integrations/supabase/client";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // Mirrors the product-images bucket limit.
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateProductImage(file: File): string | null {
  if (!Object.prototype.hasOwnProperty.call(EXTENSIONS, file.type)) {
    return "Formato no soportado. Usa JPG, PNG, WEBP o GIF.";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "La imagen original no puede superar 20MB.";
  }
  return null;
}

export async function optimizeProductImage(file: File): Promise<File> {
  const validationError = validateProductImage(file);
  if (validationError) throw new Error(validationError);
  if (file.type === "image/gif") {
    if (file.size > MAX_STORAGE_BYTES) throw new Error("Los GIF deben pesar 5MB o menos.");
    return file;
  }
  if (file.size <= MAX_STORAGE_BYTES) return file;

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("Este dispositivo no permite optimizar la imagen. Usa una fotografía de hasta 5MB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la fotografía.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob) throw new Error("No se pudo convertir la fotografía a WEBP.");
    if (blob.size > MAX_STORAGE_BYTES) throw new Error("La fotografía optimizada supera 5MB. Usa una imagen más pequeña.");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "producto";
    return new File([blob], baseName + ".webp", { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

// Storage policies scope the first path segment to the uploader's business membership.
export async function uploadProductImage(businessId: string, file: File): Promise<string> {
  const optimizedFile = await optimizeProductImage(file);
  const extension = EXTENSIONS[optimizedFile.type];
  const path = `${businessId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, optimizedFile, {
    cacheControl: "3600",
    upsert: false,
    contentType: optimizedFile.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function removeProductImage(publicUrl: string): Promise<void> {
  const marker = "/storage/v1/object/public/product-images/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return; // Do not attempt to delete externally hosted images.

  const encodedPath = publicUrl.slice(markerIndex + marker.length).split("?")[0];
  const path = decodeURIComponent(encodedPath);
  if (!path) return;

  const { error } = await supabase.storage.from("product-images").remove([path]);
  if (error) throw error;
}
