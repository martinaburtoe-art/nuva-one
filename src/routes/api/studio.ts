import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { runNuvaStudioTask } from "@/lib/nuva-studio.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import type { AiCapability } from "@/lib/ai-gateway/types";

const CAPABILITIES = new Set<AiCapability>([
  "chat", "research", "marketing", "copywriting", "image", "image_edit",
  "video", "voice", "brand", "strategy", "document", "automation",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

        const body = await request.json().catch(() => null) as {
          businessId?: string;
          capability?: AiCapability;
          prompt?: string;
        } | null;
        if (!body?.businessId || !body.prompt || !body.capability || !CAPABILITIES.has(body.capability)) {
          return json({ error: "businessId, capability y prompt son obligatorios" }, 400);
        }

        const allowed = await checkRateLimit(`studio:${userId}`, 20, 60);
        if (!allowed) return json({ error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." }, 429);

        // Tenant boundary: the authenticated user must belong to the selected business.
        const { data: membership, error: membershipError } = await supabase
          .from("business_members")
          .select("business_id")
          .eq("business_id", body.businessId)
          .eq("user_id", userId)
          .maybeSingle();
        if (membershipError || !membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const { data: job, error: jobError } = await supabase
          .from("ai_generation_jobs" as never)
          .insert({
            business_id: body.businessId,
            user_id: userId,
            capability: body.capability,
            status: "running",
            prompt: body.prompt.slice(0, 12000),
          } as never)
          .select("id")
          .single();
        if (jobError) return json({ error: "No se pudo iniciar la tarea" }, 500);

        try {
          const result = await runNuvaStudioTask({
            businessId: body.businessId,
            capability: body.capability,
            prompt: body.prompt,
            supabase,
          });

          await supabase
            .from("ai_generation_jobs" as never)
            .update({
              status: "completed",
              provider: result.metadata.provider,
              model: result.metadata.model,
              output_metadata: result.metadata,
              completed_at: new Date().toISOString(),
            } as never)
            .eq("id", (job as { id: string }).id);

          return json({ ok: true, result });
        } catch (error) {
          await supabase
            .from("ai_generation_jobs" as never)
            .update({
              status: "failed",
              error_message: error instanceof Error ? error.message.slice(0, 1000) : "Error desconocido",
              completed_at: new Date().toISOString(),
            } as never)
            .eq("id", (job as { id: string }).id);
          return json({ error: error instanceof Error ? error.message : "Error generando contenido" }, 502);
        }
      },
    },
  },
});
