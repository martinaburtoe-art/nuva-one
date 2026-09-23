import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

async function auth(request: Request) {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  if (!ok) return { error: json({ error: "Configuración de Supabase incompleta" }, 500) };
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "No autenticado" }, 401) };
  const supabase = createClient<Database>(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return { error: json({ error: "Sesión inválida o expirada" }, 401) };
  return { supabase, userId };
}

export const Route = createFileRoute("/api/nuva-action-execute")({
  server: { handlers: {
    POST: async ({ request }) => {
      const session = await auth(request);
      if ("error" in session) return session.error;
      const businessId = request.headers.get("x-business-id")?.trim();
      if (!businessId) return json({ error: "Falta x-business-id" }, 400);
      const { data: member } = await session.supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", session.userId).maybeSingle();
      if (!member || !["owner", "admin"].includes(String(member.role))) return json({ error: "Solo un propietario o administrador puede ejecutar acciones" }, 403);
      const body = await request.json().catch(() => null) as { action_id?: string } | null;
      if (!body?.action_id) return json({ error: "Falta action_id" }, 400);
      const { data: action, error: readError } = await session.supabase.from("nuva_action_queue").select("*").eq("id", body.action_id).eq("business_id", businessId).maybeSingle();
      if (readError) return json({ error: "No se pudo leer la acción" }, 500);
      if (!action) return json({ error: "Acción no encontrada" }, 404);
      if (action.status !== "approved") return json({ error: `La acción debe estar aprobada. Estado actual: ${action.status}` }, 409);
      const { data: claimedAction, error: startError } = await session.supabase
        .from("nuva_action_queue")
        .update({ status: "executing", error_message: null, updated_at: new Date().toISOString() })
        .eq("id", action.id)
        .eq("business_id", businessId)
        .eq("status", "approved")
        .select("id")
        .maybeSingle();
      if (startError || !claimedAction) return json({ error: "La acción ya fue tomada por otra ejecución o no sigue aprobada" }, 409);
      try {
        let result: Record<string, unknown>;
        if (["low-stock", "purchase-pressure"].includes(action.action_type)) {
          const { data, error } = await session.supabase.from("purchases").insert({ business_id: businessId, supplier_name: "Nüva — sugerencia", status: "pending", total: 0, purchase_date: new Date().toISOString().slice(0, 10), notes: `Acción Nüva: ${action.title}. ${action.description ?? ""}`, items: action.payload ?? {} }).select("id").single();
          if (error) throw error;
          result = { operation: "purchase_draft_created", record_id: data.id };
        } else if (["receivables-overdue", "growth-opportunity"].includes(action.action_type)) {
          const { data, error } = await session.supabase.from("customer_activities").insert({ business_id: businessId, type: "task", content: `Acción Nüva: ${action.title}. ${action.description ?? ""}`, completed: false, created_by: session.userId }).select("id").single();
          if (error) throw error;
          result = { operation: "customer_task_created", record_id: data.id };
        } else {
          result = { operation: "execution_acknowledged", destination: action.destination };
        }
        await session.supabase.from("nuva_action_queue").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_message: null }).eq("id", action.id).eq("business_id", businessId);
        await session.supabase.from("nuva_action_outcomes").insert({ business_id: businessId, action_id: action.id, outcome_type: "executed", expected_impact: action.impact, actual_impact: null, evidence: result, observed_at: new Date().toISOString() });
        return json({ ok: true, action_id: action.id, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error de ejecución";
        await session.supabase.from("nuva_action_queue").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", action.id).eq("business_id", businessId);
        return json({ error: "La acción falló y quedó registrada", code: "NUVA_ACTION_EXECUTION_FAILED" }, 500);
      }
    },
  } },
});