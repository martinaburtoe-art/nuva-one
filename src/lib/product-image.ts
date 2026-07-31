import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, mirrors the bucket's file_size_limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateProductImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato no soportado. Usa JPG, PNG, WEBP o GIF.";
  }
  if (file.size > MAX_BYTES) {
    return "La imagen no puede superar 5MB.";
  }
  return null;
}

// Path convention {business_id}/{random}-{filename} -- storage RLS policies
// check the first path segment against the uploader's business membership,
// same pattern as every other business_id-scoped table in this app.
export async function uploadProductImage(businessId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}
