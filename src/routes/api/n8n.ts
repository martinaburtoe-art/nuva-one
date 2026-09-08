import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { emitN8nEvent, getN8nConfig, verifyN8nSignature } from "@/lib/n8n.server";
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
        return json({ provider: "n8n", configured: config.configured, capabilities: ["events", "webhooks", "idempotency", "hmac"] });
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

        const result = await emitN8nEvent(event);
        if (!result.ok) return json({ error: "n8n no pudo recibir el evento", code: result.code }, result.status);
        return json({ ok: true, event_id: event.id, status: result.status, code: result.code });
      },
    },
  },
});
