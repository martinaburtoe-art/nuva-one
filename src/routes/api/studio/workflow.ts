import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { runNuvaStudioTask, planNuvaStudioTask } from "@/lib/nuva-studio.server";
import { generateGeminiImageAsset } from "@/lib/nuva-studio-media.server";
import { generateFishVoiceAsset } from "@/lib/nuva-studio-voice.server";
import { runNuvaStudioN8nTask } from "@/lib/nuva-studio-n8n.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import type { AiCapability } from "@/lib/ai-gateway/types";

const ALLOWED = new Set<AiCapability>([
  "chat", "research", "marketing", "copywriting", "image", "image_edit",
  "video", "voice", "brand", "strategy", "document", "automation",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function normalize(text: string) {
  return text.replaceAll("\0", "").trim().slice(0, 12000);
}

function serializeOutput(output: Record<string, unknown>) {
  return JSON.stringify({
    capability: output.capability,
    title: output.title,
    summary: output.summary,
    text: output.text,
    imageUrl: output.imageUrl,
    audioUrl: output.audioUrl,
    mediaUrl: output.mediaUrl,
    metadata: output.metadata,
  });
}

async function executeCapability(args: {
  capability: AiCapability;
  businessId: string;
  userId: string;
  prompt: string;
  supabase: ReturnType<typeof createClient<Database>>;
}) {
  const { capability, businessId, userId, prompt, supabase } = args;

  if (capability === "image" || capability === "image_edit") {
    const asset = await generateGeminiImageAsset({ businessId, userId, prompt, supabase });
    return {
      capability,
      title: "Pieza visual",
      summary: "Imagen generada y guardada en la biblioteca de Nüva Studio.",
      text: "Imagen creada correctamente.",
      imageUrl: asset.signedUrl,
      metadata: { provider: "google", model: asset.model, storagePath: asset.storagePath },
    };
  }

  if (capability === "voice") {
    const asset = await generateFishVoiceAsset({ businessId, prompt, supabase });
    return {
      capability,
      title: "Locución",
      summary: "Voz generada y guardada en la biblioteca de Nüva Studio.",
      text: "Locución creada correctamente.",
      audioUrl: asset.signedUrl,
      metadata: { provider: "fish_audio", model: asset.model, storagePath: asset.storagePath },
    };
  }

  if (capability === "video" || capability === "automation") {
    const result = await runNuvaStudioN8nTask({ businessId, userId, capability, prompt, supabase });
    return {
      capability,
      title: capability === "video" ? "Video" : "Automatización",
      summary: result.text,
      text: result.text,
      mediaUrl: result.url,
      metadata: { provider: "n8n", model: capability },
    };
  }

  const result = await runNuvaStudioTask({ businessId, capability, prompt, supabase });
  return {
    capability,
    title: capability === "strategy" ? "Oportunidades y prioridades" : capability,
    summary: result.text.slice(0, 280),
    text: result.text,
    metadata: result.metadata,
  };
}

export const Route = createFileRoute("/api/studio/workflow")({
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

        const body = (await request.json().catch(() => null)) as { businessId?: string; prompt?: string; maxSteps?: number } | null;
        if (!body?.businessId || !body.prompt?.trim()) return json({ error: "businessId y prompt son obligatorios" }, 400);
        if (!(await checkRateLimit(`studio-workflow:${userId}`, 6, 60))) return json({ error: "Demasiadas ejecuciones de Studio. Intenta nuevamente en un minuto." }, 429);

        const { data: membership, error: membershipError } = await supabase
          .from("business_members").select("business_id").eq("business_id", body.businessId).eq("user_id", userId).maybeSingle();
        if (membershipError || !membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const plan = await planNuvaStudioTask({ businessId: body.businessId, prompt: normalize(body.prompt), supabase });
        const steps = plan.steps.slice(0, Math.min(body.maxSteps ?? 6, 6)).filter((step) => ALLOWED.has(step.capability));
        const outputs: Array<Record<string, unknown>> = [];
        const completed = new Map<number, string>();

        for (let index = 0; index < steps.length; index += 1) {
          const step = steps[index];
          const dependencies = step.dependsOn.map((dependency) => completed.get(dependency)).filter(Boolean).join("\n\n");
          const enrichedPrompt = [
            `Objetivo general: ${plan.goal}`,
            `Instrucción: ${step.instruction}`,
            dependencies ? `Resultados previos estructurados que debes reutilizar:\n${dependencies}` : "",
            "Construye este paso para que el siguiente pueda reutilizar decisiones, mensajes, datos y assets. No repitas información innecesariamente.",
          ].filter(Boolean).join("\n\n");

          const output = await executeCapability({ capability: step.capability, businessId: body.businessId, userId, prompt: enrichedPrompt, supabase });
          const enrichedOutput = { step: index + 1, instruction: step.instruction, dependsOn: step.dependsOn, ...output };
          outputs.push(enrichedOutput);
          completed.set(index, serializeOutput(enrichedOutput));
        }

        return json({ ok: true, goal: plan.goal, rationale: plan.rationale, steps, outputs });
      },
    },
  },
});
