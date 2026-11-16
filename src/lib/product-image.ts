import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // Mirrors the product-images bucket limit.
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
  if (file.size > MAX_BYTES) {
    return "La imagen no puede superar 5MB.";
  }
  return null;
}

// Storage policies scope the first path segment to the uploader's business membership.
export async function uploadProductImage(businessId: string, file: File): Promise<string> {
  const validationError = validateProductImage(file);
  if (validationError) throw new Error(validationError);

  const extension = EXTENSIONS[file.type];
  const path = `${businessId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
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
