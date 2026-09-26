import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { NUVA_CONNECT_INTEGRATIONS } from "@/lib/nuva-connect-ecosystem";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function authenticate(request: Request) {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  if (!ok) return { error: json({ error: "Configuración de Supabase incompleta" }, 500) };
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
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

export const Route = createFileRoute("/api/integrations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;
        const businessId = request.headers.get("x-business-id")?.trim();
        if (!businessId) return json({ error: "Falta x-business-id" }, 400);
        const { data, error } = await auth.supabase
          .from("nuva_integration_connections")
          .select("id,provider,status,auth_mode,external_account_id,scopes,sync_cursor,last_synced_at,last_error,metadata,created_at,updated_at")
          .eq("business_id", businessId);
        if (error) return json({ error: "No se pudieron cargar las conexiones" }, 500);
        return json({ connections: data ?? [] });
      },
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;
        const businessId = request.headers.get("x-business-id")?.trim();
        if (!businessId) return json({ error: "Falta x-business-id" }, 400);
        const { data: membership } = await auth.supabase.from("business_members").select("business_id,role").eq("business_id", businessId).eq("user_id", auth.userId).maybeSingle();
        if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);
        if (!["owner", "admin"].includes(String(membership.role))) return json({ error: "Solo owner/admin puede configurar integraciones" }, 403);
        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "";
        const authMode = typeof body?.auth_mode === "string" ? body.auth_mode.trim().toLowerCase() : "";
        if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(provider)) return json({ error: "Proveedor inválido" }, 400);
        if (!["oauth", "api_key", "webhook", "adapter"].includes(authMode)) return json({ error: "Modo de autenticación inválido" }, 400);
        const integration = NUVA_CONNECT_INTEGRATIONS.find((item) => item.id === provider);
        if (!integration) return json({ error: "Proveedor no soportado por Nüva Connect" }, 400);
        if (!integration.modes.includes(authMode as typeof integration.modes[number])) return json({ error: "Modo de autenticación no compatible con este proveedor" }, 400);
        const { data, error } = await auth.supabase.from("nuva_integration_connections").upsert({
          business_id: businessId,
          provider,
          auth_mode: authMode,
          status: "pending",
          created_by: auth.userId,
          metadata: {},
        }, { onConflict: "business_id,provider" }).select("id,provider,status,auth_mode,created_at,updated_at").single();
        if (error) return json({ error: "No se pudo registrar la conexión", code: "INTEGRATION_CONNECTION_WRITE_FAILED" }, 500);
        return json({ ok: true, connection: data }, 201);
      },
      DELETE: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;
        const businessId = request.headers.get("x-business-id")?.trim();
        const provider = new URL(request.url).searchParams.get("provider")?.trim().toLowerCase();
        if (!businessId || !provider) return json({ error: "Faltan business_id o provider" }, 400);
        const { data: membership } = await auth.supabase.from("business_members").select("business_id,role").eq("business_id", businessId).eq("user_id", auth.userId).maybeSingle();
        if (!membership || !["owner", "admin"].includes(String(membership.role))) return json({ error: "Solo owner/admin puede desconectar integraciones" }, 403);
        const { error } = await auth.supabase.from("nuva_integration_connections").delete().eq("business_id", businessId).eq("provider", provider);
        if (error) return json({ error: "No se pudo desconectar la integración" }, 500);
        return json({ ok: true });
      },
    },
  },
});
