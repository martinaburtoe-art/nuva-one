import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { learnFromNuvaActionOutcome } from "@/lib/nuva-learning/nuva-server-outcome";
import { parsePurchaseActionPayload } from "@/lib/nuva-action-purchase-contract";

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
      if (action.mode === "review") return json({ error: "Esta acción requiere revisión en el módulo correspondiente y no admite ejecución automática." }, 409);
      const actionType = String(action.action_type ?? "");
      const purchasePayload = actionType === "low-stock" || actionType === "purchase-pressure"
        ? parsePurchaseActionPayload(action.payload)
        : null;
      if (purchasePayload && !purchasePayload.ok) {
        return json({
          error: "La recomendación todavía no contiene una compra operable. No se creó ningún registro financiero.",
          code: "NUVA_PURCHASE_DETAILS_REQUIRED",
          details: purchasePayload.reason,
        }, 422);
      }
      const { data: claimedAction, error: startError } = await session.supabase
        .from("nuva_action_queue")
        .update({ status: "executing", error_message: null, updated_at: new Date().toISOString() })
        .eq("id", action.id)
        .eq("business_id", businessId)
        .eq("status", "approved")
        .select("id")
        .maybeSingle();
      if (startError || !claimedAction) return json({ error: "La acción ya fue tomada por otra ejecución o no sigue aprobada" }, 409);
      let businessMutationCommitted = false;
      try {
        let result: Record<string, unknown>;
        if (actionType === "low-stock" || actionType === "purchase-pressure") {
          if (!purchasePayload?.ok) throw new Error("La compra no superó la validación de datos.");
          const supplier = await session.supabase.from("suppliers").select("id").eq("business_id", businessId).eq("id", purchasePayload.value.supplier_id).maybeSingle();
          if (supplier.error) throw supplier.error;
          if (!supplier.data) throw new Error("El proveedor seleccionado no existe en esta empresa.");
          const productIds = purchasePayload.value.items.map((item) => item.product_id);
          const products = await session.supabase.from("products").select("id,name").eq("business_id", businessId).in("id", productIds);
          if (products.error) throw products.error;
          if ((products.data ?? []).length !== productIds.length) throw new Error("Uno o más productos no pertenecen a esta empresa o ya no existen.");
          const productNames = new Map((products.data ?? []).map((product) => [product.id, product.name]));
          const items = purchasePayload.value.items.map((item) => ({
            product_id: item.product_id,
            name: productNames.get(item.product_id) ?? "Producto",
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total: item.quantity * item.unit_cost,
          }));
          const total = items.reduce((sum, item) => sum + item.total, 0);
          if (!Number.isFinite(total) || total <= 0) throw new Error("El total calculado de la compra no es válido.");
          const { data: purchaseData, error: purchaseError } = await session.supabase.from("purchases").insert({
            business_id: businessId,
            supplier_id: purchasePayload.value.supplier_id,
            status: "pending",
            total,
            purchase_date: new Date().toISOString().slice(0, 10),
            notes: `Acción Nüva: ${action.title}. ${action.description ?? ""}`,
            items,
          }).select("id").single();
          if (purchaseError) throw purchaseError;
          businessMutationCommitted = true;
          result = { operation: "purchase_created", record_id: purchaseData.id, total, currency: "CLP", line_count: items.length };
        } else if (actionType === "receivables-overdue" || actionType === "growth-opportunity") {
          const activityPayload = { business_id: businessId, type: "task", content: `Acción Nüva: ${action.title}. ${action.description ?? ""}`, completed: false, created_by: session.userId } as unknown as Database["public"]["Tables"]["customer_activities"]["Insert"];
          const { data: activityData, error: activityError } = await session.supabase.from("customer_activities").insert(activityPayload).select("id").single();
          if (activityError) throw activityError;
          businessMutationCommitted = true;
          result = { operation: "customer_task_created", record_id: activityData.id };
        } else {
          throw new Error(`Acción no ejecutable: ${actionType}`);
        }
        const { error: outcomeError } = await session.supabase.from("nuva_action_outcomes").insert({ business_id: businessId, action_id: action.id, outcome_type: "executed", expected_impact: action.impact, actual_impact: null, evidence: JSON.parse(JSON.stringify(result)), observed_at: new Date().toISOString() });
        if (outcomeError) throw outcomeError;
        const { error: completeError } = await session.supabase
          .from("nuva_action_queue")
          .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_message: null })
          .eq("id", action.id)
          .eq("business_id", businessId)
          .eq("status", "executing")
          .select("id")
          .maybeSingle();
        if (completeError) throw completeError;
        if (!completedAction) throw new Error("La mutación existe, pero la acción no pudo confirmar su estado final.");
        let learningWarning: string | undefined;
        try {
          await learnFromNuvaActionOutcome(session.supabase, action, result, true);
        } catch (learningError) {
          learningWarning = learningError instanceof Error ? learningError.message : "No se pudo actualizar el aprendizaje de Nüva.";
        }
        return json({ ok: true, action_id: action.id, result, ...(learningWarning ? { learning_warning: learningWarning } : {}) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error de ejecución";
        if (businessMutationCommitted) {
          // Never make a committed business mutation retryable just because a later
          // audit/state write failed. Keep it executing for explicit reconciliation.
          await session.supabase.from("nuva_action_queue").update({ error_message: `RECONCILIATION_REQUIRED: ${message}`.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", action.id).eq("business_id", businessId).eq("status", "executing");
        } else {
          await session.supabase.from("nuva_action_queue").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", action.id).eq("business_id", businessId).eq("status", "executing");
          try {
            await learnFromNuvaActionOutcome(session.supabase, action, { error: message }, false);
          } catch {
            // The execution error remains the primary failure; learning is secondary.
          }
        }
        return json({ error: "La acción falló y quedó registrada", code: "NUVA_ACTION_EXECUTION_FAILED" }, 500);
      }
    },
  } },
});