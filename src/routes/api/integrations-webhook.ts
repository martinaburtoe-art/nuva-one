import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database, Json } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { buildIntegrationContext, getNuvaIntegrationAdapter } from "@/lib/integrations/adapters";
import { sha256Hex } from "@/lib/integrations/webhook-crypto";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function getConfiguredWebhookSecret(secretRef: string | null) {
  if (!secretRef || !/^NUVA_CONNECT_SECRET_[A-Z0-9_]{1,80}$/.test(secretRef)) return "";
  return process.env[secretRef] ?? "";
}

export const Route = createFileRoute("/api/integrations-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider")?.trim().toLowerCase() ?? "";
        const externalAccountId = url.searchParams.get("account")?.trim() ?? "";
        if (!provider || !externalAccountId) return json({ error: "Faltan provider o account" }, 400);

        const { url: supabaseUrl, serviceRoleKey, ok } = getServerSupabaseEnv();
        if (!ok || !serviceRoleKey) return json({ error: "Configuración segura de Supabase incompleta" }, 500);

        const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: connection, error: connectionError } = await supabase
          .from("nuva_integration_connections")
          .select("id,business_id,provider,external_account_id,secret_ref,scopes,metadata")
          .eq("provider", provider)
          .eq("external_account_id", externalAccountId)
          .maybeSingle();

        if (connectionError || !connection) return json({ error: "Conexión no encontrada" }, 404);

        const secret = getConfiguredWebhookSecret(connection.secret_ref);
        if (!secret) return json({ error: "Webhook pendiente de configuración segura", code: "INTEGRATION_WEBHOOK_SECRET_NOT_CONFIGURED" }, 503);

        const rawBody = await request.text();
        const adapter = getNuvaIntegrationAdapter(provider);
        if (!adapter) return json({ error: "Proveedor sin adaptador activo", code: "INTEGRATION_ADAPTER_NOT_READY" }, 501);

        const valid = await adapter.verifyWebhook({ secret, headers: request.headers, rawBody });
        if (!valid) return json({ error: "Firma de webhook inválida" }, 401);

        const normalized = await adapter.normalizeWebhook({
          context: buildIntegrationContext(connection),
          headers: request.headers,
          rawBody,
        });
        const payloadHash = await sha256Hex(rawBody);

        const { data: event, error: eventError } = await supabase
          .from("nuva_integration_events")
          .insert({
            business_id: connection.business_id,
            connection_id: connection.id,
            provider,
            external_event_id: normalized.externalEventId,
            event_type: normalized.eventType,
            direction: normalized.direction,
            payload: normalized.payload as Json,
            payload_hash: payloadHash,
            normalized: normalized as unknown as Json,
            status: "received",
          })
          .select("id")
          .single();

        if (eventError?.code === "23505") return json({ ok: true, duplicate: true });
        if (eventError || !event) return json({ error: "No se pudo registrar el evento", code: "INTEGRATION_EVENT_WRITE_FAILED" }, 500);

        return json({ ok: true, event_id: event.id }, 202);
      },
    },
  },
});
