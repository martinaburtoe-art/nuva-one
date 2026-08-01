import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

export type MetaIntegration = {
  id: string;
  business_id: string;
  status: string;
  account_name: string | null;
  fb_page_id: string | null;
  ig_user_id: string | null;
  access_token: string | null;
};

// Reusado por los endpoints de overview/publish del módulo Marketing:
// valida el JWT del usuario, confirma que sea miembro del negocio (RLS) y
// trae la integración de Meta conectada de ese negocio.
export async function getAuthedMetaIntegration(
  request: Request,
  businessId: string | null,
): Promise<{ error: Response } | { integration: MetaIntegration }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !businessId) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const { url: supabaseUrl, anonKey } = getServerSupabaseEnv();
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }

  // RLS de marketing_integrations exige membresía del negocio para leer.
  const { data, error } = await userClient
    .from("marketing_integrations" as any)
    .select("id, business_id, status, account_name, fb_page_id, ig_user_id, access_token")
    .eq("business_id", businessId)
    .eq("provider", "meta")
    .maybeSingle();

  if (error || !data || (data as any).status !== "connected") {
    return { error: new Response("No hay cuenta de Meta conectada", { status: 404 }) };
  }
  return { integration: data as unknown as MetaIntegration };
}
