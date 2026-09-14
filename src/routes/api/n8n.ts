import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { emitN8nEvent, getN8nConfig } from "@/lib/n8n.server";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function authenticate(request: Request) {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  if (!ok) return { error: json({ error: "Configuración de Supabase incompleta" }, 500) };
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { error: json({ error: "No autenticado" }, 401) };

  const supabase = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return { error: json({ error: "Sesión inválida o expirada" }, 401) };
  return { supabase, userId };
}

export const Route = createFileRoute("/api/n8n")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;
        const businessId = request.headers.get("x-business-id")?.trim();
        if (!businessId) return json({ error: "Falta x-business-id" }, 400);
        const { data: membership } = await auth.supabase
          .from("business_members")
          .select("business_id")
          .eq("business_id", businessId)
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);
        const config = getN8nConfig();
        const outbox = auth.supabase as typeof auth.supabase & { from: (table: string) => any };
        const { count } = await outbox
          .from("n8n_event_outbox")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["pending", "failed"]);
        return json({
          provider: "n8n",
          configured: config.configured,
          capabilities: ["events", "webhooks", "idempotency", "hmac", "durable_outbox"],
          pending_events: count ?? 0,
        });
      },
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;
        const businessId = request.headers.get("x-business-id")?.trim();
        if (!businessId) return json({ error: "Falta x-business-id" }, 400);
        const { data: membership } = await auth.supabase
          .from("business_members")
          .select("business_id")
          .eq("business_id", businessId)
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);

        const rawBody = await request.text();
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        const eventType = typeof body.event_type === "string" ? body.event_type.trim() : "";
        const entityType = typeof body.entity_type === "string" ? body.entity_type.trim() : "";
        const entityId = body.entity_id == null ? null : String(body.entity_id);
        if (!/^[a-z][a-z0-9_.-]{2,80}$/.test(eventType)) return json({ error: "event_type inválido" }, 400);
        if (!/^[a-z][a-z0-9_.-]{1,60}$/.test(entityType)) return json({ error: "entity_type inválido" }, 400);

        const event = {
          id: randomUUID(),
          business_id: businessId,
          actor_user_id: auth.userId,
          provider: "nuva" as const,
          source: "nuva_one" as const,
          entity_type: entityType,
          entity_id: entityId,
          event_type: eventType,
          occurred_at: new Date().toISOString(),
          idempotency_key:
            typeof body.idempotency_key === "string" && body.idempotency_key.trim()
              ? body.idempotency_key.trim().slice(0, 180)
              : randomUUID(),
          payload: body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {},
        };

        const outbox = auth.supabase as typeof auth.supabase & { from: (table: string) => any };
        const { data: inserted, error: insertError } = await outbox
          .from("n8n_event_outbox")
          .upsert(
            {
              id: event.id,
              business_id: event.business_id,
              actor_user_id: event.actor_user_id,
              provider: event.provider,
              source: event.source,
              entity_type: event.entity_type,
              entity_id: event.entity_id,
              event_type: event.event_type,
              occurred_at: event.occurred_at,
              idempotency_key: event.idempotency_key,
              payload: event.payload,
              status: "pending",
              attempts: 0,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "business_id,idempotency_key", ignoreDuplicates: true },
          )
          .select("id,status,attempts")
          .maybeSingle();

        if (insertError) return json({ error: "No se pudo encolar el evento", code: "N8N_OUTBOX_WRITE_FAILED" }, 500);
        if (!inserted) {
          const { data: existing } = await outbox
            .from("n8n_event_outbox")
            .select("id,status,attempts")
            .eq("business_id", businessId)
            .eq("idempotency_key", event.idempotency_key)
            .maybeSingle();
          if (!existing) return json({ error: "Evento duplicado pero no recuperable", code: "N8N_IDEMPOTENCY_CONFLICT" }, 409);
          return json({ ok: true, duplicate: true, event_id: existing.id, status: existing.status, attempts: existing.attempts });
        }

        const result = await emitN8nEvent(event);
        if (result.ok) {
          await outbox
            .from("n8n_event_outbox")
            .update({ status: "delivered", attempts: 1, delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", event.id)
            .eq("business_id", businessId);
          return json({ ok: true, event_id: event.id, status: "delivered", code: result.code });
        }

        await outbox
          .from("n8n_event_outbox")
          .update({ status: "failed", attempts: 1, last_error: result.code, updated_at: new Date().toISOString() })
          .eq("id", event.id)
          .eq("business_id", businessId);

        return json({
          ok: false,
          queued: true,
          event_id: event.id,
          status: "failed",
          code: result.code,
          message: "El evento quedó persistido para reintento; n8n no está disponible todavía.",
        }, 202);
      },
    },
  },
});
