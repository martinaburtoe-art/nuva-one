import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import type { Database } from "@/integrations/supabase/types";

/**
 * Autorización compartida del propietario de la PLATAFORMA (rol
 * app_metadata.platform_role = 'owner'). Consolida el patrón que antes se
 * repetía en cada ruta /api/owner/*: token → getUser → claim → cliente admin.
 * Este rol NO es el rol 'owner' de un negocio cliente (member_role).
 */
export type PlatformOwnerAuth =
  | { ok: true; userId: string; admin: SupabaseClient<Database> }
  | { ok: false; status: number; error: string };

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
  });

export function platformOwnerErrorResponse(auth: Extract<PlatformOwnerAuth, { ok: false }>): Response {
  return jsonError(auth.status, auth.error);
}

export async function assertPlatformOwner(request: Request): Promise<PlatformOwnerAuth> {
  const { url, anonKey, serviceRoleKey, ok } = getServerSupabaseEnv();
  if (!ok || !serviceRoleKey) return { ok: false, status: 500, error: "Configuración de Supabase incompleta" };

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "No autenticado" };

  const authClient = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Sesión inválida o expirada" };

  const metadata = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  if (metadata.platform_role !== "owner") return { ok: false, status: 403, error: "OWNER_ACCESS_DENIED" };

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { ok: true, userId: data.user.id, admin };
}
