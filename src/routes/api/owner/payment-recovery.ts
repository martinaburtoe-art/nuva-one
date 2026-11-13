import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authorizeAgencyOwner } from "@/lib/agency/owner-auth.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { decryptPaymentCreds, getPaymentAdapter } from "@/lib/fiscal/payment-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function adminClient() {
  const env = getServerSupabaseEnv();
  if (!env.ok || !env.serviceRoleKey) throw new Error("PAYMENT_RECOVERY_SERVICE_ROLE_UNAVAILABLE");
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function recordRecoveryNote(db: ReturnType<typeof adminClient>, requestId: string, actorId: string, note: string, evidence: Record<string, unknown>) {
  const { error } = await db.rpc("owner_record_payment_recovery_action", {
    p_request_id: requestId,
    p_actor_user_id: actorId,
    p_action: "note",
    p_note: note,
    p_evidence: evidence,
    p_payment_intent_id: null,
  });
  if (error) throw error;
}

export const Route = createFileRoute("/api/owner/payment-recovery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authorizeAgencyOwner(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        try {
          const db = adminClient();
          const { data: requests, error } = await db
            .from("payment_creation_requests")
            .select("id,business_id,sale_id,provider,commerce_order,amount,subject,status,payment_intent_id,last_error,created_at,updated_at")
            .eq("status", "recovery_required")
            .order("updated_at", { ascending: false })
            .limit(100);
          if (error) throw error;

          const rows = requests ?? [];
          const businessIds = [...new Set(rows.map((row) => row.business_id).filter(Boolean))];
          const saleIds = [...new Set(rows.map((row) => row.sale_id).filter(Boolean))];
          const intentIds = [...new Set(rows.map((row) => row.payment_intent_id).filter(Boolean))];
          const requestIds = rows.map((row) => row.id);

          const [businesses, sales, intents, audit] = await Promise.all([
            businessIds.length ? db.from("businesses").select("id,name").in("id", businessIds) : Promise.resolve({ data: [], error: null }),
            saleIds.length ? db.from("sales").select("id,status,total,paid_amount").in("id", saleIds) : Promise.resolve({ data: [], error: null }),
            intentIds.length ? db.from("payment_intents").select("id,status,amount,commerce_order,provider,resolved_at").in("id", intentIds) : Promise.resolve({ data: [], error: null }),
            requestIds.length ? db.from("payment_recovery_audit").select("id,request_id,action,note,evidence,created_at").in("request_id", requestIds).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
          ]);
          const relatedError = businesses.error || sales.error || intents.error || audit.error;
          if (relatedError) throw relatedError;

          const byId = (items: Array<{ id: string }> | null) => new Map((items ?? []).map((item) => [item.id, item]));
          const businessMap = byId(businesses.data as Array<{ id: string; name: string }> | null);
          const saleMap = byId(sales.data as Array<{ id: string; status: string; total: number; paid_amount: number }> | null);
          const intentMap = byId(intents.data as Array<{ id: string; status: string; amount: number; commerce_order: string; provider: string; resolved_at: string | null }> | null);

          return Response.json({
            generated_at: new Date().toISOString(),
            requests: rows.map((row) => ({
              ...row,
              business: businessMap.get(row.business_id) ?? null,
              sale: row.sale_id ? saleMap.get(row.sale_id) ?? null : null,
              intent: row.payment_intent_id ? intentMap.get(row.payment_intent_id) ?? null : null,
            })),
            audit: audit.data ?? [],
          }, { headers: { "cache-control": "private, no-store" } });
        } catch (error) {
          console.error("Owner payment recovery GET failed", error);
          return Response.json({ error: "No fue posible cargar la cola de conciliación." }, { status: 502 });
        }
      },

      POST: async ({ request }) => {
        const auth = await authorizeAgencyOwner(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        const parsedBody = await request.json().catch(() => ({}));
        const body = parsedBody && typeof parsedBody === "object" ? parsedBody as Record<string, unknown> : {};
        const requestId = typeof body.request_id === "string" ? body.request_id : "";
        const action = typeof body.action === "string" ? body.action : "";
        const note = typeof body.note === "string" ? body.note.trim() : "";
        if (!UUID_RE.test(requestId)) return Response.json({ error: "Solicitud de conciliación inválida." }, { status: 400 });
        if (!["check_provider", "link_intent", "refund_required", "manual_adjustment_required", "note"].includes(action)) {
          return Response.json({ error: "Acción de conciliación no permitida." }, { status: 400 });
        }
        if (action !== "check_provider" && note.length < 5) {
          return Response.json({ error: "Escribe una nota de al menos 5 caracteres para dejar trazabilidad." }, { status: 400 });
        }
        if (note.length > 1000) return Response.json({ error: "La nota supera el máximo de 1000 caracteres." }, { status: 400 });
        try {
          const allowed = await checkRateLimit(`owner-payment-recovery:${auth.userId}:${requestId}`, 20, 3600);
          if (!allowed) return Response.json({ error: "Demasiadas verificaciones para esta solicitud. Intenta más tarde." }, { status: 429 });

          const db = adminClient();
          const { data: recovery, error: recoveryError } = await db
            .from("payment_creation_requests")
            .select("id,business_id,sale_id,provider,commerce_order,amount,status,payment_intent_id")
            .eq("id", requestId)
            .maybeSingle();
          if (recoveryError) throw recoveryError;
          if (!recovery || recovery.status !== "recovery_required") {
            return Response.json({ error: "La solicitud ya no está pendiente de conciliación." }, { status: 409 });
          }

          const intentId = recovery.payment_intent_id as string | null;
          let intent: any = null;
          if (intentId) {
            const result = await db.from("payment_intents")
              .select("id,business_id,provider,token,commerce_order,amount,status")
              .eq("id", intentId).maybeSingle();
            if (result.error) throw result.error;
            intent = result.data;
          }
          if (!intent) {
            const result = await db.from("payment_intents")
              .select("id,business_id,provider,token,commerce_order,amount,status")
              .eq("business_id", recovery.business_id)
              .eq("provider", recovery.provider)
              .eq("commerce_order", recovery.commerce_order)
              .maybeSingle();
            if (result.error) throw result.error;
            intent = result.data;
          }

          if (action === "link_intent") {
            if (!intent) {
              await recordRecoveryNote(db, requestId, auth.userId, "No se encontró un intento coincidente para vincular.", { source: "server_database_lookup", outcome: "intent_not_found", verified: false });
              return Response.json({ error: "No existe un intento que coincida con el negocio, proveedor y orden." }, { status: 404 });
            }
            const { data, error } = await db.rpc("owner_record_payment_recovery_action", {
              p_request_id: requestId,
              p_actor_user_id: auth.userId,
              p_action: "link_intent",
              p_note: note,
              p_evidence: {
                source: "server_database_lookup",
                matched_business: intent.business_id === recovery.business_id,
                matched_provider: intent.provider === recovery.provider,
                matched_order: intent.commerce_order === recovery.commerce_order,
                matched_amount: Number(intent.amount) === Number(recovery.amount),
                intent_status: intent.status,
              },
              p_payment_intent_id: intent.id,
            });
            if (error) throw error;
            return Response.json({ ok: true, result: data });
          }

          if (action === "refund_required" || action === "manual_adjustment_required" || action === "note") {
            const { data, error } = await db.rpc("owner_record_payment_recovery_action", {
              p_request_id: requestId,
              p_actor_user_id: auth.userId,
              p_action: action,
              p_note: note,
              p_evidence: { source: "owner_console", decision: action, recorded_at: new Date().toISOString() },
              p_payment_intent_id: null,
            });
            if (error) throw error;
            return Response.json({ ok: true, result: data });
          }

          // VSB remains fail-closed until its official reconciliation contract is approved.
          if (recovery.provider === "vsb") {
            await recordRecoveryNote(db, requestId, auth.userId, "La conciliación VSB está bloqueada hasta validar su contrato oficial.", { source: "provider_policy", provider: "vsb", outcome: "provider_disabled", verified: false });
            return Response.json({ error: "La conciliación VSB permanece deshabilitada hasta validar el contrato oficial del proveedor." }, { status: 409 });
          }

          // Provider lookup and all credential decryption remain server-side.
          if (!intent) {
            await recordRecoveryNote(db, requestId, auth.userId, "No existe un intento asociado para consultar la pasarela.", { source: "server_database_lookup", outcome: "intent_not_found", verified: false });
            return Response.json({ error: "No hay un intento de pago asociado. Vincúlalo primero para verificar la pasarela." }, { status: 409 });
          }
          if (
            intent.business_id !== recovery.business_id ||
            intent.provider !== recovery.provider ||
            intent.commerce_order !== recovery.commerce_order ||
            Number(intent.amount) !== Number(recovery.amount)
          ) {
            await recordRecoveryNote(db, requestId, auth.userId, "El intento encontrado no coincide con los datos originales; se mantiene en cuarentena.", { source: "server_database_lookup", outcome: "intent_mismatch", verified: false });
            return Response.json({ error: "El intento no coincide con los datos originales; permanece en cuarentena." }, { status: 409 });
          }

          const integrationResult = await db.from("billing_integrations")
            .select("api_key,secret_key,api_url,environment")
            .eq("business_id", recovery.business_id)
            .eq("type", "payment")
            .eq("provider", recovery.provider)
            .eq("status", "connected")
            .maybeSingle();
          if (integrationResult.error) throw integrationResult.error;
          if (!integrationResult.data) {
            await recordRecoveryNote(db, requestId, auth.userId, "No existe una integración activa para consultar la pasarela.", { source: "integration_lookup", outcome: "integration_unavailable", verified: false });
            return Response.json({ error: "No existe una integración activa para verificar el pago." }, { status: 409 });
          }

          const adapter = getPaymentAdapter(recovery.provider);
          if (!adapter) {
            await recordRecoveryNote(db, requestId, auth.userId, "El proveedor no tiene un adaptador habilitado para conciliación.", { source: "provider_policy", provider: recovery.provider, outcome: "adapter_unavailable", verified: false });
            return Response.json({ error: "Proveedor no compatible con la conciliación." }, { status: 409 });
          }
          const { apiKey, secretKey } = decryptPaymentCreds(integrationResult.data);
          let providerResult;
          try {
            providerResult = await adapter.checkStatus({
              apiKey,
              secretKey,
              apiUrl: integrationResult.data.api_url || "",
              environment: integrationResult.data.environment,
            }, intent.token);
          } catch {
            await recordRecoveryNote(db, requestId, auth.userId, "La consulta server-to-server a la pasarela falló; el cobro permanece en cuarentena.", { source: "provider_api", provider: recovery.provider, outcome: "provider_unavailable", verified: false });
            return Response.json({ error: "La pasarela no pudo verificar el estado. La solicitud sigue en cuarentena." }, { status: 503 });
          }

          if (!providerResult.ok) {
            await recordRecoveryNote(db, requestId, auth.userId, "La pasarela no confirmó el estado del cobro; el caso permanece en cuarentena.", { source: "provider_api", provider: recovery.provider, outcome: "provider_unavailable", verified: false });
            return Response.json({ error: "La pasarela no pudo verificar el estado. La solicitud sigue en cuarentena." }, { status: 503 });
          }
          if (!["paid", "pending", "rejected"].includes(providerResult.status)) {
            const { error: auditError } = await db.rpc("owner_record_payment_recovery_action", {
              p_request_id: requestId,
              p_actor_user_id: auth.userId,
              p_action: "note",
              p_note: "La consulta a la pasarela no entregó un estado conciliable; se mantiene en cuarentena.",
              p_evidence: { source: "provider_api", provider_status: "unknown", verified: false },
              p_payment_intent_id: null,
            });
            if (auditError) throw auditError;
            return Response.json({ error: "La pasarela devolvió un estado no concluyente. No se modificó el cobro." }, { status: 409 });
          }

          const { data, error } = await db.rpc("owner_reconcile_payment_recovery", {
            p_request_id: requestId,
            p_actor_user_id: auth.userId,
            p_provider_status: providerResult.status,
            p_provider_amount: providerResult.amount,
            p_provider_commerce_order: providerResult.commerceOrder,
          });
          if (error) throw error;
          return Response.json({ ok: true, result: data });
        } catch (error) {
          console.error("Owner payment recovery POST failed", error instanceof Error ? error.name : "unknown error");
          return Response.json({ error: "No fue posible completar la conciliación. El cobro permanece en cuarentena." }, { status: 502 });
        }
      },
    },
  },
});
