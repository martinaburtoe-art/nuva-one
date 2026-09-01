import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildBusinessContext, capContext } from "@/lib/business-context.server";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL ?? "veo-3.1-generate-preview";

function cleanPrompt(value: string) { return value.replaceAll("\0", "").trim().slice(0, 12000); }

export async function generateGeminiVideoAsset(args: { businessId: string; prompt: string; supabase: SupabaseClient<Database> }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurada para Nüva Video.");
  const context = await buildBusinessContext(args.supabase, args.businessId);
  const contextText = context ? capContext(context) : "No hay contexto empresarial disponible.";
  const prompt = ["Crea un video comercial profesional para Nüva Studio.", "Mantén coherencia con el negocio, producto, audiencia y objetivo. No inventes atributos.", `CONTEXTO EMPRESARIAL:\n${contextText}`, `SOLICITUD:\n${cleanPrompt(args.prompt)}`].join("\n\n");

  const start = await fetch(`${BASE_URL}/models/${VIDEO_MODEL}:predictLongRunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "9:16", numberOfVideos: 1, resolution: "720p" } }),
  });
  if (!start.ok) { const detail = await start.text(); throw new Error(`Veo respondió ${start.status}: ${detail.slice(0, 700)}`); }
  const operation = (await start.json()) as { name?: string };
  if (!operation.name) throw new Error("Veo no devolvió una operación de generación.");

  const deadline = Date.now() + 240_000;
  let status: { done?: boolean; error?: { message?: string }; response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } } } = {};
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const poll = await fetch(`${BASE_URL}/${operation.name}`, { headers: { "x-goog-api-key": apiKey } });
    if (!poll.ok) { const detail = await poll.text(); throw new Error(`Veo polling respondió ${poll.status}: ${detail.slice(0, 500)}`); }
    status = await poll.json() as typeof status;
    if (status.error) throw new Error(`Veo falló: ${status.error.message ?? "error desconocido"}`);
    if (status.done) break;
  }
  if (!status.done) throw new Error("La generación de video superó el tiempo máximo de Studio. El job de video debe reintentarse.");
  const uri = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) throw new Error("Veo terminó sin devolver una URL de video.");

  const videoResponse = await fetch(uri, { headers: { "x-goog-api-key": apiKey } });
  if (!videoResponse.ok) { const detail = await videoResponse.text(); throw new Error(`No se pudo descargar el video generado: ${detail.slice(0, 500)}`); }
  const bytes = new Uint8Array(await videoResponse.arrayBuffer());
  const storagePath = `${args.businessId}/studio/${crypto.randomUUID()}.mp4`;
  const { error: uploadError } = await args.supabase.storage.from("nuva-studio-assets").upload(storagePath, bytes, { contentType: "video/mp4", upsert: false });
  if (uploadError) throw new Error(`No se pudo guardar el video: ${uploadError.message}`);
  const { data: signed, error: signedError } = await args.supabase.storage.from("nuva-studio-assets").createSignedUrl(storagePath, 3600);
  if (signedError) throw new Error(`No se pudo crear el acceso temporal al video: ${signedError.message}`);
  return { storagePath, signedUrl: signed.signedUrl, mimeType: "video/mp4", model: VIDEO_MODEL };
}
