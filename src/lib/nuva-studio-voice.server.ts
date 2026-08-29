import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_MODEL = process.env.FISH_AUDIO_MODEL ?? "s2-pro";

export async function generateFishVoiceAsset(args: {
  businessId: string;
  prompt: string;
  supabase: SupabaseClient<Database>;
}) {
  const apiKey = process.env.FISH_API_KEY ?? process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) throw new Error("FISH_API_KEY no está configurada para Nüva Voice.");

  const text = args.prompt.replace(/\u0000/g, "").trim().slice(0, 10000);
  const response = await fetch(FISH_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: FISH_MODEL,
    },
    body: JSON.stringify({
      text,
      format: "mp3",
      sample_rate: 44100,
      mp3_bitrate: 128,
      normalize: true,
      latency: "normal",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fish Audio respondió ${response.status}: ${detail.slice(0, 500)}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const storagePath = `${args.businessId}/studio/${crypto.randomUUID()}.mp3`;
  const { error: uploadError } = await args.supabase.storage
    .from("nuva-studio-assets")
    .upload(storagePath, bytes, { contentType: "audio/mpeg", upsert: false });
  if (uploadError) throw new Error(`No se pudo guardar el audio: ${uploadError.message}`);

  const { data: signed, error: signedError } = await args.supabase.storage
    .from("nuva-studio-assets")
    .createSignedUrl(storagePath, 3600);
  if (signedError) throw new Error(`No se pudo crear el acceso temporal al audio: ${signedError.message}`);

  return {
    storagePath,
    signedUrl: signed.signedUrl,
    mimeType: "audio/mpeg",
    model: FISH_MODEL,
  };
}
