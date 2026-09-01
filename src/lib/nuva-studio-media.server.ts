import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildBusinessContext, capContext } from "@/lib/business-context.server";

const GEMINI_IMAGE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/images/generations";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

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
  const prompt = [
    "Crea una pieza visual profesional para Nüva Studio.",
    "Respeta estrictamente el producto, la marca y el objetivo. No inventes precios, logos o atributos.",
    `CONTEXTO EMPRESARIAL:\n${contextText}`,
    `SOLICITUD:\n${cleanPrompt(args.prompt)}`,
  ].join("\n\n");

  const response = await fetch(GEMINI_IMAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, response_format: "b64_json", n: 1 }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini Creative respondió ${response.status}: ${detail.slice(0, 700)}`);
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; mime_type?: string }> };
  const image = payload.data?.[0];
  if (!image?.b64_json) throw new Error("Gemini no devolvió una imagen utilizable.");

  const mimeType = image.mime_type ?? "image/png";
  const extension = mimeType.includes("jpeg") ? "jpg" : "png";
  const storagePath = `${args.businessId}/studio/${crypto.randomUUID()}.${extension}`;
  const bytes = Uint8Array.from(Buffer.from(image.b64_json, "base64"));

  const { error: uploadError } = await args.supabase.storage.from("nuva-studio-assets").upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(`No se pudo guardar el activo: ${uploadError.message}`);
  const { data: signed, error: signedError } = await args.supabase.storage.from("nuva-studio-assets").createSignedUrl(storagePath, 3600);
  if (signedError) throw new Error(`No se pudo crear el acceso temporal al activo: ${signedError.message}`);

  return { storagePath, signedUrl: signed.signedUrl, mimeType, model: IMAGE_MODEL };
}
