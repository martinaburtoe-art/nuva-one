import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildBusinessContext, capContext } from "@/lib/business-context.server";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const IMAGE_MIME_TYPE = "image/jpeg";

function cleanPrompt(value: string) {
  return value.replaceAll("\0", "").trim().slice(0, 12000);
}

export async function generateGeminiImageAsset(args: {
  businessId: string;
  userId: string;
  prompt: string;
  supabase: SupabaseClient<Database>;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurada para Nüva Creative.");

  const context = await buildBusinessContext(args.supabase, args.businessId);
  const contextText = context ? capContext(context) : "No hay contexto empresarial disponible.";
  const input = [
    "Genera una pieza visual profesional para Nüva Studio.",
    "Respeta estrictamente el producto, la marca y el objetivo descritos.",
    "No inventes precios, logos o atributos de producto que no estén indicados.",
    `CONTEXTO EMPRESARIAL:\n${contextText}`,
    `SOLICITUD:\n${cleanPrompt(args.prompt)}`,
  ].join("\n\n");

  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      input,
      response_format: { type: "image", mime_type: IMAGE_MIME_TYPE, aspect_ratio: "1:1", image_size: "1K" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini Creative respondió ${response.status}: ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as {
    output_image?: { data?: string; mime_type?: string };
    output?: Array<{ type?: string; data?: string; mime_type?: string }>;
  };
  const imageBlock = payload.output_image ?? payload.output?.find((item) => item.type === "image");
  if (!imageBlock?.data) throw new Error("Gemini no devolvió una imagen utilizable.");

  const mimeType = imageBlock.mime_type ?? IMAGE_MIME_TYPE;
  const extension = mimeType.includes("jpeg") ? "jpg" : "png";
  const storagePath = `${args.businessId}/studio/${crypto.randomUUID()}.${extension}`;
  const bytes = Uint8Array.from(Buffer.from(imageBlock.data, "base64"));

  const { error: uploadError } = await args.supabase.storage.from("nuva-studio-assets").upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(`No se pudo guardar el activo: ${uploadError.message}`);
  const { data: signed, error: signedError } = await args.supabase.storage.from("nuva-studio-assets").createSignedUrl(storagePath, 3600);
  if (signedError) throw new Error(`No se pudo crear el acceso temporal al activo: ${signedError.message}`);

  return { storagePath, signedUrl: signed.signedUrl, mimeType, model: IMAGE_MODEL };
}
