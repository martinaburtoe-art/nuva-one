import { createFileRoute } from "@tanstack/react-router";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { verifyMetaState } from "@/lib/meta-oauth-state.server";

// Callback del login de Facebook/Instagram: Meta redirige acá con ?code&state.
// No llega con sesión de Supabase (es un redirect del navegador, no un fetch
// autenticado), por eso el business_id viaja firmado en `state` y esta ruta
// escribe con la service role key en vez de depender de RLS por JWT.
export const Route = createFileRoute("/api/marketing/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const redirectTo = (path: string) => new Response(null, { status: 302, headers: { Location: `${siteUrl}/marketing${path}` } });

        const reqUrl = new URL(request.url);
        const code = reqUrl.searchParams.get("code");
        const state = reqUrl.searchParams.get("state");
        const oauthError = reqUrl.searchParams.get("error");
        if (oauthError) return redirectTo("?meta=cancelled");
        if (!code || !state) return redirectTo("?meta=error");

        const verified = verifyMetaState(state);
        if (!verified) return redirectTo("?meta=error");
        const { businessId } = verified;

        const appId = process.env.META_APP_ID || process.env.VITE_META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        if (!appId || !appSecret) return redirectTo("?meta=error");

        const redirectUri = `${siteUrl}/api/marketing/meta/callback`;

        try {
          // 1. Code -> user access token
          const tokenRes = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(appId)}` +
              `&redirect_uri=${encodeURIComponent(redirectUri)}` +
              `&client_secret=${encodeURIComponent(appSecret)}` +
              `&code=${encodeURIComponent(code)}`,
          );
          const tokenJson = await tokenRes.json();
          const userAccessToken = tokenJson.access_token as string | undefined;
          if (!userAccessToken) return redirectTo("?meta=error");

          // 2. Páginas de Facebook que administra + su token de página
          const pagesRes = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`,
          );
          const pagesJson = await pagesRes.json();
          const page = pagesJson?.data?.[0];
          if (!page) return redirectTo("?meta=sin_paginas");

          const { url: supabaseUrl } = getServerSupabaseEnv();
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!serviceKey) return redirectTo("?meta=error");
          const { createClient } = await import("@supabase/supabase-js");
          const admin = createClient(supabaseUrl, serviceKey);

          const { error: upsertError } = await admin.from("marketing_integrations" as any).upsert(
            {
              business_id: businessId,
              provider: "meta",
              status: "connected",
              account_name: page.name,
              page_id: page.instagram_business_account?.id || page.id,
              access_token: page.access_token,
              connected_at: new Date().toISOString(),
            },
            { onConflict: "business_id,provider" },
          );
          if (upsertError) return redirectTo("?meta=error");

          return redirectTo("?meta=connected");
        } catch {
          return redirectTo("?meta=error");
        }
      },
    },
  },
});
