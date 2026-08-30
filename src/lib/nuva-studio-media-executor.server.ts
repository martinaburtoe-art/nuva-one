import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateGeminiImageAsset } from "@/lib/nuva-studio-media.server";
import { generateFishVoiceAsset } from "@/lib/nuva-studio-voice.server";
import { createStudioCallback } from "@/lib/nuva-studio-jobs.server";

const TOOL_BY_CAPABILITY = { image: "studio.image", image_edit: "studio.image_edit", video: "studio.video", voice: "studio.voice" } as const;
type MediaCapability = keyof typeof TOOL_BY_CAPABILITY;
export type ExecutedMediaResult = { step: number; capability: MediaCapability; status: "completed" | "queued" | "blocked" | "failed"; storagePath?: string; signedUrl?: string; mimeType?: string; model?: string; callbackId?: string; error?: string };
function clean(value: string) { return value.replaceAll("\0", "").trim().slice(0, 24000); }

function randomToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type AssetWriter = { from: (table: string) => { insert: (values: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> } };
async function registerAsset(supabase: SupabaseClient<Database>, args: { businessId: string; userId: string; jobId?: string; step: number; capability: MediaCapability; storagePath?: string; mimeType?: string; model?: string; prompt: string }) {
  if (!args.storagePath) return;
  const writer = supabase as unknown as AssetWriter;
  const { error } = await writer.from("ai_asset_library").insert({
    id: crypto.randomUUID(), business_id: args.businessId, user_id: args.userId, job_id: args.jobId ?? null,
    asset_type: args.capability, title: `Nüva Studio · ${args.capability} · paso ${args.step + 1}`,
    storage_path: args.storagePath, metadata: { source: "nuva-studio-agent", capability: args.capability, step: args.step, model: args.model ?? null, mimeType: args.mimeType ?? null, prompt: clean(args.prompt) },
  });
  if (error) throw new Error(`No se pudo registrar el activo: ${error.message}`);
}

export async function executeStudioMedia(args: { businessId: string; userId: string; jobId?: string; step: number; capability: MediaCapability; prompt: string; supabase: SupabaseClient<Database> }): Promise<ExecutedMediaResult> {
  const toolId = TOOL_BY_CAPABILITY[args.capability];
  const { data: tool, error: toolError } = await args.supabase.from("ai_tool_registry").select("id,cost_units,enabled").eq("id", toolId).eq("enabled", true).maybeSingle();
  if (toolError) return { step: args.step, capability: args.capability, status: "failed", error: toolError.message };
  if (!tool) return { step: args.step, capability: args.capability, status: "blocked", error: `Herramienta no disponible: ${toolId}` };
  const { error: reservationError } = await args.supabase.rpc("reserve_ai_tool_quota" as never, { p_business_id: args.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
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
    const callbackBaseUrl = process.env.N8N_VIDEO_CALLBACK_URL;
    if (!webhook || !callbackBaseUrl || !args.jobId) {
      await args.supabase.rpc("release_ai_tool_quota" as never, { p_business_id: args.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
      return { step: args.step, capability: args.capability, status: "blocked", error: "Video requiere N8N_VIDEO_WEBHOOK_URL, N8N_VIDEO_CALLBACK_URL y un job persistente; no se consumió cuota." };
    }

    const callbackToken = randomToken();
    const callbackHash = await sha256(callbackToken);
    const callback = await createStudioCallback({ supabase: args.supabase, jobId: args.jobId, step: args.step, callbackType: "video", tokenHash: callbackHash });
    const callbackUrl = new URL(callbackBaseUrl);
    callbackUrl.searchParams.set("jobId", args.jobId);
    callbackUrl.searchParams.set("step", String(args.step));
    callbackUrl.searchParams.set("token", callbackToken);
    const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId: args.businessId, userId: args.userId, jobId: args.jobId, step: args.step, prompt: clean(args.prompt), provider: "google", model: "veo-3.1-generate-preview", callbackUrl: callbackUrl.toString(), callbackId: callback.id }) });
    if (!response.ok) throw new Error(`n8n video respondió ${response.status}`);
    return { step: args.step, capability: args.capability, status: "queued", model: "veo-3.1-generate-preview", callbackId: callback.id };
  } catch (error) {
    await args.supabase.rpc("release_ai_tool_quota" as never, { p_business_id: args.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
    return { step: args.step, capability: args.capability, status: "failed", error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
