import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createStudioPlanAndJob, runStudioJob } from "@/lib/nuva-studio-job-runner.server";
import { getStudioJob, updateStudioJobStatus } from "@/lib/nuva-studio-jobs.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function authenticatedClient(request: Request) {
  const env = getServerSupabaseEnv();
  if (!env.ok) return { error: json({ error: "Configuración de Supabase incompleta" }, 500) };
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return { error: json({ error: "No autenticado" }, 401) };
  const supabase = createClient<Database>(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) return { error: json({ error: "Sesión inválida o expirada" }, 401) };
  return { supabase, userId };
}

export const Route = createFileRoute("/api/studio-agent")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticatedClient(request);
        if (auth.error) return auth.error;
        const jobId = new URL(request.url).searchParams.get("jobId");
        if (!jobId) return json({ error: "jobId es obligatorio" }, 400);
        const job = await getStudioJob({ supabase: auth.supabase, jobId });
        if (!job) return json({ error: "Job no encontrado" }, 404);
        if (job.user_id !== auth.userId) return json({ error: "No tienes acceso a este job" }, 403);
        return json({ ok: true, job });
      },
      POST: async ({ request }) => {
        const auth = await authenticatedClient(request);
        if (auth.error) return auth.error;
        const body = (await request.json().catch(() => null)) as {
          action?: "start" | "resume" | "cancel";
          businessId?: string;
          prompt?: string;
          maxSteps?: number;
          jobId?: string;
          idempotencyKey?: string;
        } | null;

        if (body?.action === "cancel") {
          if (!body.jobId) return json({ error: "jobId es obligatorio" }, 400);
          const job = await getStudioJob({ supabase: auth.supabase, jobId: body.jobId });
          if (!job) return json({ error: "Job no encontrado" }, 404);
          if (job.user_id !== auth.userId) return json({ error: "No tienes acceso a este job" }, 403);
          await updateStudioJobStatus({ supabase: auth.supabase, jobId: body.jobId, status: "cancelled" });
          return json({ ok: true, status: "cancelled", jobId: body.jobId });
        }

        if (body?.action === "resume") {
          if (!body.jobId) return json({ error: "jobId es obligatorio" }, 400);
          const job = await getStudioJob({ supabase: auth.supabase, jobId: body.jobId });
          if (!job) return json({ error: "Job no encontrado" }, 404);
          if (job.user_id !== auth.userId) return json({ error: "No tienes acceso a este job" }, 403);
          const result = await runStudioJob({ supabase: auth.supabase, jobId: body.jobId, userId: auth.userId });
          return json({ ok: true, job: result });
        }

        if (!body?.businessId || !body.prompt?.trim()) return json({ error: "businessId y prompt son obligatorios" }, 400);
        if (body.prompt.length > 12000) return json({ error: "El objetivo es demasiado largo" }, 400);
        if (!(await checkRateLimit(`studio-agent:${auth.userId}`, 5, 60))) return json({ error: "Demasiadas ejecuciones del agente. Intenta nuevamente." }, 429);
        const { data: membership } = await auth.supabase.from("business_members").select("business_id").eq("business_id", body.businessId).eq("user_id", auth.userId).maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const idempotencyKey = (body.idempotencyKey ?? request.headers.get("Idempotency-Key") ?? crypto.randomUUID()).trim();
        if (!idempotencyKey || idempotencyKey.length > 200) return json({ error: "Idempotency-Key inválida" }, 400);
        try {
          const planned = await createStudioPlanAndJob({ supabase: auth.supabase, businessId: body.businessId, userId: auth.userId, prompt: body.prompt, maxSteps: body.maxSteps ?? 4, idempotencyKey });
          if (!planned.created && ["completed", "partial", "blocked", "failed", "cancelled"].includes(planned.job.status)) {
            return json({ ok: true, idempotent: true, job: planned.job, plan: planned.plan });
          }
          const result = await runStudioJob({ supabase: auth.supabase, jobId: planned.job.id, userId: auth.userId });
          return json({ ok: true, idempotent: !planned.created, job: result, plan: planned.plan });
        } catch (error) {
          const typed = error as { code?: string; validationErrors?: string[]; plan?: unknown };
          if (typed.code === "PLAN_INVALID") return json({ error: "El plan generado no pasó la validación de seguridad.", validationErrors: typed.validationErrors, plan: typed.plan }, 422);
          if (typed.code === "FORBIDDEN") return json({ error: "No tienes acceso a este job" }, 403);
          throw error;
        }
      },
    },
  },
});
