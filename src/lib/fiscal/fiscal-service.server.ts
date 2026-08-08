import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

/** Helper de autenticación compartido por los endpoints de pagos (Flow/VSB).
 * La emisión de documentos vía API (OpenFactura/LibreDTE) fue reemplazada
 * por el modo asistido: ver /billing y src/lib/sii-declaration-pdf.ts. */
export async function authedUserClient(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const { url, anonKey } = getServerSupabaseEnv();
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return client;
}
