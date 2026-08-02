import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

export type SiiIntegration = {
  id: string;
  business_id: string;
  status: string;
  environment: "dev" | "prod";
  api_key: string | null;
  rut: string | null;
  razon_social: string | null;
  giro: string | null;
  acteco: string | null;
  direccion: string | null;
  comuna: string | null;
  cdg_sii_sucur: string | null;
};

export function openFacturaBaseUrl(environment: string): string {
  return environment === "prod" ? "https://api.haulmer.com" : "https://dev-api.haulmer.com";
}

/** Cliente Supabase autenticado con el JWT del usuario: respeta RLS, así que
 * solo devuelve datos si el usuario es miembro del negocio pedido. */
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

export async function getSiiIntegration(
  request: Request,
  businessId: string | null,
): Promise<{ error: Response } | { client: NonNullable<Awaited<ReturnType<typeof authedUserClient>>>; integration: SiiIntegration } > {
  if (!businessId) return { error: new Response("business_id requerido", { status: 400 }) };
  const client = await authedUserClient(request);
  if (!client) return { error: new Response("Unauthorized", { status: 401 }) };

  const { data, error } = await client
    .from("billing_integrations" as any)
    .select(
      "id, business_id, status, environment, api_key, rut, razon_social, giro, acteco, direccion, comuna, cdg_sii_sucur",
    )
    .eq("business_id", businessId)
    .eq("provider", "openfactura")
    .maybeSingle();

  if (error || !data || (data as any).status !== "connected") {
    return { error: new Response("No hay cuenta SII conectada", { status: 404 }) };
  }
  return { client, integration: data as unknown as SiiIntegration };
}
