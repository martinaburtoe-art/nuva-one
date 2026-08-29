import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { planNuvaStudioTask, runNuvaStudioTask } from "@/lib/nuva-studio.server";
import { classifyStudioSteps, buildMediaRequests, summarizeExecution } from "@/lib/nuva-studio-execution.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import type { AiCapability } from "@/lib/ai-gateway/types";

const TOOL_BY_CAPABILITY: Record<string, string> = {
  chat: "agent.chat",
  research: "studio.research",
  marketing: "studio.marketing",
  copywriting: "studio.copywriting",
  brand: "studio.brand",
  strategy: "studio.strategy",
  document: "studio.document",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return json({ error: "Sesión inválida o expirada" }, 401);

        const body = (await request.json().catch(() => null)) as {
          businessId?: string;
          prompt?: string;
          maxSteps?: number;
        } | null;

        if (!body?.businessId || !body.prompt?.trim()) {
          return json({ error: "businessId y prompt son obligatorios" }, 400);
        }
        if (body.prompt.length > 12000) return json({ error: "El objetivo es demasiado largo" }, 400);
        if (!(await checkRateLimit(`studio-agent:${userId}`, 5, 60))) {
          return json({ error: "Demasiadas ejecuciones del agente. Intenta nuevamente." }, 429);
        }

        const { data: membership } = await supabase
          .from("business_members")
          .select("business_id")
          .eq("business_id", body.businessId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const plan = await planNuvaStudioTask({
          businessId: body.businessId,
          prompt: body.prompt,
          supabase,
        });
        const steps = plan.steps.slice(0, Math.min(Math.max(body.maxSteps ?? 4, 1), 6));
        const classified = classifyStudioSteps(steps);
        const media = buildMediaRequests(classified.media);
        const outputs: Array<{ step: number; capability: AiCapability; result: string }> = [];

        for (let index = 0; index < classified.text.length; index += 1) {
          const step = classified.text[index];
          const toolId = TOOL_BY_CAPABILITY[step.capability];
          if (!toolId) continue;

          const { data: tool } = await supabase
            .from("ai_tool_registry")
            .select("id,cost_units,enabled")
            .eq("id", toolId)
            .eq("enabled", true)
            .maybeSingle();
          if (!tool) {
            return json({
              error: `Herramienta no disponible: ${step.capability}`,
              plan: { ...plan, steps },
              completed: outputs,
              media,
            }, 503);
          }

          const { error: reserveError } = await supabase.rpc("reserve_ai_tool_quota" as never, {
            p_business_id: body.businessId,
            p_tool_id: toolId,
            p_units: tool.cost_units,
          } as never);
          if (reserveError) {
            return json({
              error: "Se alcanzó el límite de uso de una de las herramientas del plan.",
              plan: { ...plan, steps },
              completed: outputs,
              media,
            }, 429);
          }

          try {
            const dependencies = step.dependsOn
              .filter((n) => n >= 0 && n < outputs.length)
              .map((n) => outputs[n]?.result)
              .filter(Boolean)
              .join("\n\n");

            const task = await runNuvaStudioTask({
              businessId: body.businessId,
              capability: step.capability,
              prompt: [
                `Objetivo: ${plan.goal}`,
                `Paso ${index + 1}: ${step.instruction}`,
                dependencies ? `Resultados previos:\n${dependencies}` : "",
                "Produce un entregable concreto y utilizable.",
              ].filter(Boolean).join("\n\n"),
              supabase,
            });
            outputs.push({ step: step.index, capability: step.capability, result: task.text });
          } catch (error) {
            await supabase.rpc("release_ai_tool_quota" as never, {
              p_business_id: body.businessId,
              p_tool_id: toolId,
              p_units: tool.cost_units,
            } as never);
            throw error;
          }
        }

        const execution = summarizeExecution(outputs, media);
        return json({
          ok: true,
          execution,
          plan: { ...plan, steps },
          outputs,
          media,
        });
      },
    },
  },
});
