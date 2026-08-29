import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { planNuvaStudioTask, runNuvaStudioTask } from "@/lib/nuva-studio.server";
import { executeStudioMedia } from "@/lib/nuva-studio-media-executor.server";
import { validateStudioPlan } from "@/lib/nuva-studio-execution.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import type { AiCapability } from "@/lib/ai-gateway/types";

const TOOL_BY_CAPABILITY: Partial<Record<AiCapability, string>> = {
  chat: "agent.chat", research: "studio.research", marketing: "studio.marketing", copywriting: "studio.copywriting",
  brand: "studio.brand", strategy: "studio.strategy", document: "studio.document", automation: "studio.automation",
};
const MEDIA_CAPABILITIES = new Set<AiCapability>(["image", "image_edit", "video", "voice"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/studio-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = getServerSupabaseEnv();
        if (!env.ok) return json({ error: "Configuración de Supabase incompleta" }, 500);
        const authorization = request.headers.get("authorization") ?? "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
        if (!token) return json({ error: "No autenticado" }, 401);
        const supabase = createClient<Database>(env.url, env.anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return json({ error: "Sesión inválida o expirada" }, 401);
        const body = (await request.json().catch(() => null)) as { businessId?: string; prompt?: string; maxSteps?: number } | null;
        if (!body?.businessId || !body.prompt?.trim()) return json({ error: "businessId y prompt son obligatorios" }, 400);
        if (body.prompt.length > 12000) return json({ error: "El objetivo es demasiado largo" }, 400);
        if (!(await checkRateLimit(`studio-agent:${userId}`, 5, 60))) return json({ error: "Demasiadas ejecuciones del agente. Intenta nuevamente." }, 429);
        const { data: membership } = await supabase.from("business_members").select("business_id").eq("business_id", body.businessId).eq("user_id", userId).maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const plan = await planNuvaStudioTask({ businessId: body.businessId, prompt: body.prompt, supabase });
        const steps = plan.steps.slice(0, Math.min(Math.max(body.maxSteps ?? 4, 1), 6)).map((step, index) => ({ ...step, index }));
        const validationErrors = validateStudioPlan(steps);
        if (validationErrors.length) return json({ error: "El plan generado no pasó la validación de seguridad.", validationErrors, plan: { ...plan, steps } }, 422);

        const outputs: Array<{ step: number; capability: AiCapability; result: string }> = [];
        const media: Array<Record<string, unknown>> = [];
        const outputByStep = new Map<number, string>();

        for (const step of steps) {
          if (step.dependsOn.some((dependency) => !outputByStep.has(dependency))) {
            return json({ error: `No se pudieron resolver las dependencias del paso ${step.index + 1}.`, plan: { ...plan, steps }, outputs, media }, 422);
          }
          const dependencies = step.dependsOn.map((dependency) => outputByStep.get(dependency)).filter(Boolean).join("\n\n");
          const prompt = [`Objetivo: ${plan.goal}`, `Paso ${step.index + 1}: ${step.instruction}`, dependencies ? `Resultados de pasos anteriores:\n${dependencies}` : "", "Produce un entregable concreto y utilizable. No inventes datos empresariales."].filter(Boolean).join("\n\n");

          if (MEDIA_CAPABILITIES.has(step.capability)) {
            const result = await executeStudioMedia({ businessId: body.businessId, userId, step: step.index, capability: step.capability as "image" | "image_edit" | "video" | "voice", prompt, supabase });
            media.push(result);
            if (result.status === "failed" || result.status === "blocked") {
              return json({ ok: true, execution: { status: outputs.length ? "partial" : "blocked", completed: outputs, media }, plan: { ...plan, steps }, outputs, media });
            }
            outputByStep.set(step.index, result.signedUrl ?? result.storagePath ?? result.status);
            continue;
          }

          const toolId = TOOL_BY_CAPABILITY[step.capability];
          if (!toolId) return json({ error: `Herramienta no registrada: ${step.capability}` }, 503);
          const { data: tool } = await supabase.from("ai_tool_registry").select("id,cost_units,enabled").eq("id", toolId).eq("enabled", true).maybeSingle();
          if (!tool) return json({ error: `Herramienta no disponible: ${step.capability}` }, 503);
          const { error: reservationError } = await supabase.rpc("reserve_ai_tool_quota" as never, { p_business_id: body.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
          if (reservationError) return json({ error: "Se alcanzó el límite de uso de una de las herramientas del plan.", plan: { ...plan, steps }, outputs, media }, 429);
          try {
            const task = await runNuvaStudioTask({ businessId: body.businessId, capability: step.capability, prompt, supabase });
            outputs.push({ step: step.index, capability: step.capability, result: task.text });
            outputByStep.set(step.index, task.text);
          } catch (error) {
            await supabase.rpc("release_ai_tool_quota" as never, { p_business_id: body.businessId, p_tool_id: toolId, p_units: tool.cost_units } as never);
            throw error;
          }
        }
        return json({ ok: true, execution: { status: "completed", completed: outputs, media }, plan: { ...plan, steps }, outputs, media });
      },
    },
  },
});
