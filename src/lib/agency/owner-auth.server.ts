import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

export type AgencyOwnerAuthorization =
  | { ok: true; userId: string; accessToken: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

export function isPlatformOwner(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const appMetadata = (user as { app_metadata?: unknown }).app_metadata;
  return Boolean(
    appMetadata &&
    typeof appMetadata === "object" &&
    (appMetadata as Record<string, unknown>).platform_role === "owner",
  );
}

export async function authorizeAgencyOwner(request: Request): Promise<AgencyOwnerAuthorization> {
  const { url, anonKey, ok } = getServerSupabaseEnv();
  if (!ok || !url || !anonKey) {
    return { ok: false, status: 503, error: "Configuración de autenticación no disponible" };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  if (!token) return { ok: false, status: 401, error: "No autenticado" };

  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return { ok: false, status: 401, error: "Sesión inválida o expirada" };
    }
    if (!isPlatformOwner(data.user)) {
      return { ok: false, status: 403, error: "AGENCY_ACCESS_DENIED" };
    }
    return { ok: true, userId: data.user.id, accessToken: token };
  } catch {
    return { ok: false, status: 503, error: "No fue posible validar la sesión" };
  }
}
