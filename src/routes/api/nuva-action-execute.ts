import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { learnFromNuvaActionOutcome } from "@/lib/nuva-learning/nuva-server-outcome";
import { buildPurchaseRecordItems, parsePurchaseActionPayload, purchaseRecordMatchesAction } from "@/lib/nuva-action-purchase-contract";

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
      const actionType = String(action.action_type ?? "");
      const isPurchaseAction = actionType === "low-stock" || actionType === "purchase-pressure";
      const purchasePayload = isPurchaseAction ? parsePurchaseActionPayload(action.payload) : null;
      if (purchasePayload && !purchasePayload.ok) {
        return json({
          error: "La recomendación todavía no contiene una compra operable. No se creó ningún registro financiero.",
          code: "NUVA_PURCHASE_DETAILS_REQUIRED",
          details: purchasePayload.reason,
        }, 422);
      }
      if (action.mode === "review") return json({ error: "Esta acción requiere revisión en el módulo correspondiente y no admite ejecución automática." }, 409);

      const purchaseFingerprint = purchasePayload?.ok
        ? (() => {
            const items = buildPurchaseRecordItems(purchasePayload.value.items, new Map());
            return {
              supplier_id: purchasePayload.value.supplier_id,
              tax_treatment: purchasePayload.value.tax_treatment,
              vat_rate: purchasePayload.value.vat_rate,
              total: items.reduce((sum, item) => sum + item.total, 0),
              items,
            };
          })()
        : null;
      if (purchaseFingerprint && (!Number.isSafeInteger(purchaseFingerprint.total) || purchaseFingerprint.total <= 0)) {
        return json({ error: "El total calculado de la compra no es válido.", code: "NUVA_PURCHASE_TOTAL_INVALID" }, 422);
      }

      let existingPurchaseForAction: {
        id: string;
        supplier_id: string | null;
        total: number;
        tax_treatment: string;
        vat_rate: number;
        items: unknown;
        status: string;
      } | null = null;
      if (isPurchaseAction && purchaseFingerprint) {
        const { data: existingPurchase, error: existingPurchaseError } = await session.supabase
          .from("purchases")
          .select("id,supplier_id,total,tax_treatment,vat_rate,items,status")
          .eq("business_id", businessId)
          .eq("source_action_id", action.id)
          .maybeSingle();
        if (existingPurchaseError) return json({ error: "No se pudo conciliar la compra existente.", code: "NUVA_PURCHASE_RECONCILIATION_FAILED" }, 500);
        if (existingPurchase) {
          if (!purchaseRecordMatchesAction(existingPurchase, purchaseFingerprint)) {
            return json({ error: "La acción ya tiene una compra asociada con datos distintos. Requiere conciliación manual; no se creó otra compra.", code: "NUVA_PURCHASE_IDEMPOTENCY_CONFLICT" }, 409);
          }
          existingPurchaseForAction = existingPurchase;
        }
      }

      if (action.status === "completed") {
        if (isPurchaseAction && existingPurchaseForAction) {
          return json({
            ok: true,
            action_id: action.id,
            result: {
              operation: "purchase_draft_created",
              record_id: existingPurchaseForAction.id,
              total: existingPurchaseForAction.total,
              currency: "CLP",
              status: existingPurchaseForAction.status,
              idempotent_replay: true,
            },
          });
        }
        return isPurchaseAction
          ? json({ error: "La acción figura completada, pero no se encontró su compra vinculada.", code: "NUVA_ACTION_STATE_INCONSISTENT" }, 409)
          : json({ error: "La acción ya fue completada y no admite una segunda ejecución.", code: "NUVA_ACTION_ALREADY_COMPLETED" }, 409);
      }

      const retryablePurchase = isPurchaseAction && (action.status === "failed" || action.status === "executing");
      if (action.status !== "approved" && !retryablePurchase) {
        return json({ error: `La acción no se puede ejecutar desde el estado ${action.status}.` }, 409);
      }
      if (isPurchaseAction && action.status === "executing" && !existingPurchaseForAction) {
        return json({ error: "La ejecución anterior sigue sin una compra conciliable. Espera su resultado antes de reintentar.", code: "NUVA_ACTION_RECONCILIATION_PENDING" }, 409);
      }

      const claimTimestamp = new Date().toISOString();
      let claimedAction: { id: string } | null = null;
      let startError: { message?: string } | null = null;
      if (isPurchaseAction && action.status === "executing") {
        const claim = await session.supabase
          .from("nuva_action_queue")
          .update({ error_message: null, updated_at: claimTimestamp })
          .eq("id", action.id)
          .eq("business_id", businessId)
          .eq("status", "executing")
          .eq("updated_at", action.updated_at)
          .select("id")
          .maybeSingle();
        claimedAction = claim.data;
        startError = claim.error;
      } else {
        const claim = await session.supabase
          .from("nuva_action_queue")
          .update({ status: "executing", error_message: null, updated_at: claimTimestamp })
          .eq("id", action.id)
          .eq("business_id", businessId)
          .eq("status", action.status)
          .select("id")
          .maybeSingle();
        claimedAction = claim.data;
        startError = claim.error;
      }
      if (startError || !claimedAction) return json({ error: "La acción ya fue tomada por otra ejecución o cambió durante la conciliación." }, 409);
      let businessMutationCommitted = Boolean(existingPurchaseForAction);
      try {
        let result: Record<string, unknown>;
        if (actionType === "low-stock" || actionType === "purchase-pressure") {
          if (!purchasePayload?.ok) throw new Error("La compra no superó la validación de datos.");
          if (!purchaseFingerprint) throw new Error("La compra no superó la validación de datos.");
          let purchaseData: NonNullable<typeof existingPurchaseForAction> | null = existingPurchaseForAction;
          let idempotentReplay = Boolean(existingPurchaseForAction);

          if (!purchaseData) {
            const supplier = await session.supabase.from("suppliers").select("id,name").eq("business_id", businessId).eq("id", purchaseFingerprint.supplier_id).maybeSingle();
            if (supplier.error) throw supplier.error;
            if (!supplier.data) throw new Error("El proveedor seleccionado no existe en esta empresa.");
            const productIds = purchaseFingerprint.items.map((item) => item.product_id);
            const products = await session.supabase.from("products").select("id,name").eq("business_id", businessId).in("id", productIds);
            if (products.error) throw products.error;
            if ((products.data ?? []).length !== productIds.length) throw new Error("Uno o más productos no pertenecen a esta empresa o ya no existen.");
            const productNames = new Map((products.data ?? []).map((product) => [product.id, product.name]));
            const items = buildPurchaseRecordItems(purchasePayload.value.items, productNames);
            const purchaseInsert = {
              business_id: businessId,
              source_action_id: action.id,
              supplier_id: purchaseFingerprint.supplier_id,
              supplier_name: supplier.data.name,
              category: "Mercadería para reventa",
              tax_treatment: purchaseFingerprint.tax_treatment,
              vat_rate: purchaseFingerprint.vat_rate,
              status: "pending" as const,
              total: purchaseFingerprint.total,
              purchase_date: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
              notes: `Acción Nüva: ${action.title}. ${action.description ?? ""} Tratamiento tributario declarado: ${purchaseFingerprint.tax_treatment} (${purchaseFingerprint.vat_rate}% IVA); verificar contra documento tributario al recibir.`,
              items,
            };
            const { data: insertedPurchase, error: purchaseError } = await session.supabase
              .from("purchases")
              .upsert(purchaseInsert, { onConflict: "source_action_id", ignoreDuplicates: true })
              .select("id,supplier_id,total,tax_treatment,vat_rate,items,status")
              .maybeSingle();
            if (purchaseError) throw purchaseError;

            if (insertedPurchase) {
              purchaseData = insertedPurchase;
            } else {
              const { data: existingPurchase, error: readError } = await session.supabase
                .from("purchases")
                .select("id,supplier_id,total,tax_treatment,vat_rate,items,status")
                .eq("business_id", businessId)
                .eq("source_action_id", action.id)
                .maybeSingle();
              if (readError) throw readError;
              if (!existingPurchase) throw new Error("La compra puede haberse confirmado, pero no se pudo leer su registro idempotente. Requiere conciliación.");
              purchaseData = existingPurchase;
              idempotentReplay = true;
            }
          }

          if (!purchaseData) throw new Error("No se pudo obtener el registro de compra.");
          businessMutationCommitted = true;
          if (!purchaseRecordMatchesAction(purchaseData, purchaseFingerprint)) {
            throw new Error("IDEMPOTENCY_PAYLOAD_MISMATCH: la compra existente no coincide con el payload actual.");
          }
          result = {
            operation: "purchase_draft_created",
            record_id: purchaseData.id,
            total: purchaseData.total,
            currency: "CLP",
            line_count: purchaseFingerprint.items.length,
            status: purchaseData.status,
            idempotent_replay: idempotentReplay,
          };
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
        if (outcomeError && outcomeError.code !== "23505") throw outcomeError;
        const { data: completedAction, error: completeError } = await session.supabase
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