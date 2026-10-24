import { createFileRoute } from "@tanstack/react-router";
import { assertPlatformOwner, platformOwnerErrorResponse } from "@/lib/platform-owner.server";

/**
 * Métricas agregadas del SaaS para la Owner Console. Conecta por primera vez
 * el RPC get_platform_owner_metrics (SECURITY DEFINER con validación de rol
 * owner dentro de la propia función; migración 20260818090000), que estaba
 * huérfano: ningún llamador lo usaba. Devuelve AGREGADOS de plataforma —
 * nunca datos privados de negocios individuales.
 */
export const Route = createFileRoute("/api/owner/platform-metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await assertPlatformOwner(request);
        if (!auth.ok) return platformOwnerErrorResponse(auth);

        const { data, error } = await auth.admin.rpc("get_platform_owner_metrics", {
          p_owner_id: auth.userId,
        });
        if (error) {
          return new Response(
            JSON.stringify({ error: "No se pudieron cargar las métricas de plataforma" }),
            { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }

        return new Response(JSON.stringify({ platform: data ?? null, generated_at: new Date().toISOString() }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
        });
      },
    },
  },
});
