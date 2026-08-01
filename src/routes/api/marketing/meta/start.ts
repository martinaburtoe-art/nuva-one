import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { signMetaState } from "@/lib/meta-oauth-state.server";

// Arranca el login OAuth de Meta (Facebook/Instagram) para el módulo de
// Marketing: el frontend llama esto autenticado, recibe la URL del diálogo
// de login de Facebook y hace window.location a esa URL -- nada de pegar
// tokens a mano.
export const Route = createFileRoute("/api/marketing/meta/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const appId = process.env.META_APP_ID || process.env.VITE_META_APP_ID;
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        if (!appId) {
          return new Response(JSON.stringify({ error: "Meta App no configurada" }), {
            status: 500,
          });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const { url: supabaseUrl, anonKey } = getServerSupabaseEnv();
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData, error: userError } = await userClient.auth.getUser();
        if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return new Response("business_id requerido", { status: 400 });

        // RLS: solo devuelve la fila si el usuario es miembro del negocio.
        const { data: biz } = await userClient
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .maybeSingle();
        if (!biz) return new Response("Unauthorized", { status: 401 });

        const redirectUri = `${siteUrl}/api/marketing/meta/callback`;
        const state = signMetaState(businessId);
        const scope = [
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
          "instagram_basic",
          "instagram_content_publish",
          "business_management",
        ].join(",");

        const url =
          `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${encodeURIComponent(state)}` +
          `&scope=${encodeURIComponent(scope)}` +
          `&response_type=code`;

        return new Response(JSON.stringify({ url }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
