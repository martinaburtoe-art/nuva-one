import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateGeminiImageAsset } from "@/lib/nuva-studio-media.server";
import { generateFishVoiceAsset } from "@/lib/nuva-studio-voice.server";

const TOOL_BY_CAPABILITY = {
  image: "studio.image",
  image_edit: "studio.image_edit",
  video: "studio.video",
  voice: "studio.voice",
} as const;

type MediaCapability = keyof typeof TOOL_BY_CAPABILITY;

export type ExecutedMediaResult = {
  step: number;
  capability: MediaCapability;
  status: "completed" | "queued" | "blocked" | "failed";
  storagePath?: string;
  signedUrl?: string;
  mimeType?: string;
  model?: string;
  error?: string;
};

function clean(value: string) {
  return value.replaceAll("\0", "").trim().slice(0, 24000);
}

async function registerAsset(
  supabase: SupabaseClient<Database>,
  args: { businessId: string; userId: string; step: number; capability: MediaCapability; storagePath?: string; mimeType?: string; model?: string; prompt: string },
) {
  if (!args.storagePath) return;
  const { error } = await supabase.from("ai_asset_library").insert({
    id: crypto.randomUUID(),
    business_id: args.businessId,
    user_id: args.userId,
    asset_type: args.capability,
    title: `Nüva Studio · ${args.capability} · paso ${args.step + 1}`,
    storage_path: args.storagePath,
    metadata: { source: "nuva-studio-agent", capability: args.capability, step: args.step, model: args.model ?? null, mimeType: args.mimeType ?? null, prompt: clean(args.prompt) },
  });
  if (error) throw new Error(`No se pudo registrar el activo: ${error.message}`);
}

export async function executeStudioMedia(args: {
  businessId: string;
  userId: string;
  step: number;
  capability: MediaCapability;
  prompt: string;
  supabase: SupabaseClient<Database>;
}): Promise<ExecutedMediaResult> {
  const toolId = TOOL_BY_CAPABILITY[args.capability];
  const { data: tool, error: toolError } = await args.supabase
    .from("ai_tool_registry")
    .select("id,cost_units,enabled")
    .eq("id", toolId)
    .eq("enabled", true)
    .maybeSingle();
  if (toolError) return { step: args.step, capability: args.capability, status: "failed", error: toolError.message };
  if (!tool) return { step: args.step, capability: args.capability, status: "blocked", error: `Herramienta no disponible: ${toolId}` };

  const { error: reservationError } = await args.supabase.rpc("reserve_ai_tool_quota" as never, {
    p_business_id: args.businessId,
    p_tool_id: toolId,
    p_units: tool.cost_units,
  } as never);
  if (reservationError) return { step: args.step, capability: args.capability, status: "blocked", error: "Se alcanzó el límite de uso para esta capacidad." };

  try {
    if (args.capability === "image" || args.capability === "image_edit") {
      const asset = await generateGeminiImageAsset({ businessId: args.businessId, userId: args.userId, prompt: args.prompt, supabase: args.supabase });
      await registerAsset(args.supabase, { ...args, storagePath: asset.storagePath, mimeType: asset.mimeType, model: asset.model });
      return { step: args.step, capability: args.capability, status: "completed", ...asset };
    }

    if (args.capability === "voice") {
      const asset = await generateFishVoiceAsset({ businessId: args.businessId, prompt: args.prompt, supabase: args.supabase });
      await registerAsset(args.supabase, { ...args, storagePath: asset.storagePath, mimeType: asset.mimeType, model: asset.model });
      return { step: args.step, capability: args.capability, status: "completed", ...asset };
    }

    const webhook = process.env.N8N_VIDEO_WEBHOOK_URL;
    if (!webhook) {
      await args.supabase.rpc("release_ai_tool_quota" as never, { p_business_id: args.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
      return { step: args.step, capability: args.capability, status: "blocked", error: "N8N_VIDEO_WEBHOOK_URL no está configurado; el trabajo de video quedó listo para ejecución." };
    }

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: args.businessId, userId: args.userId, step: args.step, prompt: clean(args.prompt), provider: "google", model: "veo-3.1-generate-preview" }),
    });
    if (!response.ok) throw new Error(`n8n video respondió ${response.status}`);
    return { step: args.step, capability: args.capability, status: "queued", model: "veo-3.1-generate-preview" };
  } catch (error) {
    await args.supabase.rpc("release_ai_tool_quota" as never, { p_business_id: args.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
    return { step: args.step, capability: args.capability, status: "failed", error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
