import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { evaluateStudioCampaignCycle } from "@/lib/nuva-studio-campaign-evaluator.server";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function auth(request: Request) {
  const env = getServerSupabaseEnv();
  if (!env.ok) return { error: json({ error: "Configuración de Supabase incompleta" }, 500) };
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: json({ error: "No autenticado" }, 401) };
  const supabase = createClient<Database>(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return { error: json({ error: "Sesión inválida o expirada" }, 401) };
  return { supabase, userId };
}

export const Route = createFileRoute("/api/studio-campaign-metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const a = await auth(request);
        if (a.error) return a.error;
        const body = (await request.json().catch(() => null)) as {
          businessId?: string;
          campaignId?: string;
          cycleId?: string;
          metricName?: string;
          metricValue?: number;
          source?: string;
          sourceReference?: string;
          observedAt?: string;
          metadata?: Record<string, unknown>;
        } | null;

        if (!body?.businessId || !body.campaignId || !body.cycleId || !body.metricName?.trim() || !body.source?.trim()) {
          return json({ error: "businessId, campaignId, cycleId, metricName y source son obligatorios" }, 400);
        }
        if (typeof body.metricValue !== "number" || !Number.isFinite(body.metricValue)) {
          return json({ error: "metricValue debe ser un número finito observado externamente" }, 400);
        }
        if (body.metricName.length > 100 || body.source.length > 200 || (body.sourceReference?.length ?? 0) > 1000) {
          return json({ error: "Los campos de métrica exceden el límite permitido" }, 400);
        }

        const { data: membership } = await a.supabase
          .from("business_members")
          .select("business_id")
          .eq("business_id", body.businessId)
          .eq("user_id", a.userId)
          .maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const { data: cycle, error: cycleError } = await (a.supabase as any)
          .from("nuva_studio_campaign_cycles")
          .select("id,campaign_id,cycle_number,status")
          .eq("id", body.cycleId)
          .eq("campaign_id", body.campaignId)
          .maybeSingle();
        if (cycleError) return json({ error: cycleError.message }, 500);
        if (!cycle) return json({ error: "Ciclo no encontrado" }, 404);

        const { data: campaign, error: campaignError } = await (a.supabase as any)
          .from("nuva_studio_campaigns")
          .select("id,business_id")
          .eq("id", body.campaignId)
          .eq("business_id", body.businessId)
          .maybeSingle();
        if (campaignError) return json({ error: campaignError.message }, 500);
        if (!campaign) return json({ error: "Campaña no encontrada" }, 404);

        const { data: metric, error } = await (a.supabase as any)
          .from("nuva_studio_campaign_metrics")
          .insert({
            business_id: body.businessId,
            campaign_id: body.campaignId,
            cycle_id: body.cycleId,
            metric_name: body.metricName.trim().slice(0, 100),
            metric_value: body.metricValue,
            source: body.source.trim().slice(0, 200),
            source_reference: body.sourceReference?.trim().slice(0, 1000) ?? null,
            observed_at: body.observedAt ? new Date(body.observedAt).toISOString() : new Date().toISOString(),
            metadata: body.metadata ?? {},
            created_by: a.userId,
          })
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 500);

        const evaluation = await evaluateStudioCampaignCycle({
          supabase: a.supabase,
          businessId: body.businessId,
          campaignId: body.campaignId,
          cycleId: body.cycleId,
          cycleNumber: cycle.cycle_number,
          jobStatus: cycle.status === "failed" ? "failed" : "completed",
        });

        return json({ ok: true, metric, evaluation }, 201);
      },
    },
  },
});
