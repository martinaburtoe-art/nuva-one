import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { runNuvaStudioTask } from "@/lib/nuva-studio.server";
import { generateGeminiImageAsset } from "@/lib/nuva-studio-media.server";
import { generateFishVoiceAsset } from "@/lib/nuva-studio-voice.server";
import { runNuvaStudioN8nTask } from "@/lib/nuva-studio-n8n.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import type { AiCapability } from "@/lib/ai-gateway/types";

const CAPABILITIES = new Set<AiCapability>([
  "chat",
  "research",
  "marketing",
  "copywriting",
  "image",
  "image_edit",
  "video",
  "voice",
  "brand",
  "strategy",
  "document",
  "automation",
]);

const CAPABILITY_TO_TOOL: Record<AiCapability, string> = {
  chat: "agent.chat",
  research: "studio.research",
  marketing: "studio.marketing",
  copywriting: "studio.copywriting",
  image: "studio.image",
  image_edit: "studio.image_edit",
  video: "studio.video",
  voice: "studio.voice",
  brand: "studio.brand",
  strategy: "studio.strategy",
  document: "studio.document",
  automation: "studio.automation",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function quotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("daily_limit")) return { error: "Has alcanzado el límite diario de esta herramienta.", status: 429 };
  if (message.includes("monthly_limit")) return { error: "Has alcanzado el límite mensual de esta herramienta.", status: 429 };
  if (message.includes("plan_not_allowed")) return { error: "Esta herramienta no está disponible en tu plan actual.", status: 403 };
  if (message.includes("tool_unavailable")) return { error: "Esta herramienta no está disponible temporalmente.", status: 503 };
  return null;
}

export const Route = createFileRoute("/api/studio")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = getServerSupabaseEnv();
        if (!env.ok) return json({ error: "Configuración de Supabase incompleta" }, 500);

        const authorization = request.headers.get("authorization") ?? "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
        if (!token) return json({ error: "No autenticado" }, 401);

        const supabase = createClient<Database>(env.url, env.anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return json({ error: "Sesión inválida o expirada" }, 401);

        const body = (await request.json().catch(() => null)) as {
          businessId?: string;
          capability?: AiCapability;
          prompt?: string;
        } | null;
        if (!body?.businessId || !body.prompt || !body.capability || !CAPABILITIES.has(body.capability)) {
          return json({ error: "businessId, capability y prompt son obligatorios" }, 400);
        }

        const allowed = await checkRateLimit(`studio:${userId}`, 20, 60);
        if (!allowed) return json({ error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." }, 429);

        const { data: membership, error: membershipError } = await supabase
          .from("business_members")
          .select("business_id")
          .eq("business_id", body.businessId)
          .eq("user_id", userId)
          .maybeSingle();
        if (membershipError || !membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const toolId = CAPABILITY_TO_TOOL[body.capability];
        const { data: tool, error: toolError } = await supabase
          .from("ai_tool_registry")
          .select("id, cost_units, enabled")
          .eq("id", toolId)
          .eq("enabled", true)
          .maybeSingle();
        if (toolError || !tool) return json({ error: "La herramienta solicitada no está disponible." }, 503);

        const { data: reservation, error: quotaRpcError } = await supabase.rpc("reserve_ai_tool_quota" as never, {
          p_business_id: body.businessId,
          p_tool_id: toolId,
          p_units: tool.cost_units,
        } as never);
        if (quotaRpcError) {
          const mapped = quotaError(quotaRpcError);
          if (mapped) return json({ error: mapped.error }, mapped.status);
          return json({ error: "No se pudo validar el uso disponible." }, 503);
        }

        const unitsCharged = tool.cost_units;
        const { data: job, error: jobError } = await supabase
          .from("ai_generation_jobs" as never)
          .insert({
            business_id: body.businessId,
            user_id: userId,
            tool_id: toolId,
            capability: body.capability,
            status: "running",
            prompt: body.prompt.slice(0, 12000),
            units_charged: unitsCharged,
            started_at: new Date().toISOString(),
          } as never)
          .select("id")
          .single();
        if (jobError) {
          await supabase.rpc("release_ai_tool_quota" as never, { p_business_id: body.businessId, p_tool_id: toolId, p_units: unitsCharged } as never);
          return json({ error: "No se pudo iniciar la tarea" }, 500);
        }

        try {
          if (body.capability === "image" || body.capability === "image_edit") {
            const asset = await generateGeminiImageAsset({ businessId: body.businessId, userId, prompt: body.prompt, supabase });
            const { data: libraryAsset, error: assetError } = await supabase
              .from("ai_asset_library" as never)
              .insert({
                business_id: body.businessId,
                user_id: userId,
                job_id: (job as { id: string }).id,
                asset_type: "image",
                title: body.prompt.slice(0, 120),
                storage_path: asset.storagePath,
                metadata: { provider: "google", model: asset.model, mimeType: asset.mimeType },
              } as never)
              .select("id")
              .single();
            if (assetError) throw new Error(`No se pudo registrar el activo: ${assetError.message}`);
            const result = {
              text: "Imagen creada y guardada en tu biblioteca de Nüva Studio.",
              imageUrl: asset.signedUrl,
              assetId: (libraryAsset as { id: string }).id,
              metadata: { provider: "google" as const, model: asset.model, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0, fallbackUsed: false, attempts: 1 },
            };
            await supabase.from("ai_generation_jobs" as never).update({ status: "completed", provider: result.metadata.provider, model: result.metadata.model, output_metadata: { ...result.metadata, quota: reservation, assetId: result.assetId }, completed_at: new Date().toISOString() } as never).eq("id", (job as { id: string }).id);
            return json({ ok: true, result, usage: reservation });
          }

          if (body.capability === "voice") {
            const asset = await generateFishVoiceAsset({ businessId: body.businessId, prompt: body.prompt, supabase });
            const { data: libraryAsset, error: assetError } = await supabase
              .from("ai_asset_library" as never)
              .insert({
                business_id: body.businessId,
                user_id: userId,
                job_id: (job as { id: string }).id,
                asset_type: "audio",
                title: body.prompt.slice(0, 120),
                storage_path: asset.storagePath,
                metadata: { provider: "fish_audio", model: asset.model, mimeType: asset.mimeType },
              } as never)
              .select("id")
              .single();
            if (assetError) throw new Error(`No se pudo registrar el audio: ${assetError.message}`);
            const result = {
              text: "Locución creada y guardada en tu biblioteca de Nüva Studio.",
              audioUrl: asset.signedUrl,
              assetId: (libraryAsset as { id: string }).id,
              metadata: { provider: "fish_audio" as const, model: asset.model, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0, fallbackUsed: false, attempts: 1 },
            };
            await supabase.from("ai_generation_jobs" as never).update({ status: "completed", provider: result.metadata.provider, model: result.metadata.model, output_metadata: { ...result.metadata, quota: reservation, assetId: result.assetId }, completed_at: new Date().toISOString() } as never).eq("id", (job as { id: string }).id);
            return json({ ok: true, result, usage: reservation });
          }

          if (body.capability === "video" || body.capability === "automation") {
            const result = await runNuvaStudioN8nTask({ businessId: body.businessId, userId, capability: body.capability, prompt: body.prompt, supabase });
            const assetType = body.capability === "video" ? "video" : null;
            let assetId: string | undefined;
            if (assetType && result.url) {
              const { data: libraryAsset, error: assetError } = await supabase
                .from("ai_asset_library" as never)
                .insert({ business_id: body.businessId, user_id: userId, job_id: (job as { id: string }).id, asset_type: assetType, title: body.prompt.slice(0, 120), public_url: result.url, metadata: { provider: "n8n", capability: body.capability } } as never)
                .select("id")
                .single();
              if (assetError) throw new Error(`No se pudo registrar el video: ${assetError.message}`);
              assetId = (libraryAsset as { id: string }).id;
            }
            const output = { text: result.text, ...(result.url ? { mediaUrl: result.url } : {}), ...(assetId ? { assetId } : {}), metadata: { provider: "n8n", model: body.capability, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0, fallbackUsed: false, attempts: 1 } };
            await supabase.from("ai_generation_jobs" as never).update({ status: "completed", provider: "n8n", model: body.capability, output_metadata: { ...output.metadata, quota: reservation, assetId }, completed_at: new Date().toISOString() } as never).eq("id", (job as { id: string }).id);
            return json({ ok: true, result: output, usage: reservation });
          }

          const result = await runNuvaStudioTask({ businessId: body.businessId, capability: body.capability, prompt: body.prompt, supabase });
          await supabase.from("ai_generation_jobs" as never).update({ status: "completed", provider: result.metadata.provider, model: result.metadata.model, output_metadata: { ...result.metadata, quota: reservation }, completed_at: new Date().toISOString() } as never).eq("id", (job as { id: string }).id);
          return json({ ok: true, result, usage: reservation });
        } catch (error) {
          await supabase.from("ai_generation_jobs" as never).update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 1000) : "Error desconocido", completed_at: new Date().toISOString() } as never).eq("id", (job as { id: string }).id);
          await supabase.rpc("release_ai_tool_quota" as never, { p_business_id: body.businessId, p_tool_id: toolId, p_units: unitsCharged } as never);
          return json({ error: error instanceof Error ? error.message : "Error generando contenido" }, 502);
        }
      },
    },
  },
});
