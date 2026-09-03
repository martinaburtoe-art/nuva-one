import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import {
  getMercadoPagoConfig,
  updateMercadoPagoSubscription,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

export const Route = createFileRoute("/api/billing/mercadopago/manage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });
        const config = getMercadoPagoConfig();
        if (!config) return Response.json({ error: "Mercado Pago no está configurado" }, { status: 503 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const action = body.action as "pause" | "resume" | "cancel" | "pending" | undefined;
        if (!businessId || !action) return Response.json({ error: "Datos incompletos" }, { status: 400 });

        const { data: userData } = await client.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const { data: membership } = await client
          .from("business_members")
          .select("role")
          .eq("business_id", businessId)
          .eq("user_id", userId)
          .in("role", ["owner", "admin"])
          .maybeSingle();
        if (!membership) {
          return new Response("Forbidden", { status: 403 });
        }

        const allowed = await checkRateLimit(`mp-manage:${businessId}`, 20, 3600);
        if (!allowed) return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429 });

        const { data: business } = await client
          .from("businesses")
          .select("id,mercadopago_preapproval_id")
          .eq("id", businessId)
          .maybeSingle();
        if (!business?.mercadopago_preapproval_id) {
          return Response.json({ error: "No existe una suscripción Mercado Pago vinculada" }, { status: 404 });
        }

        const status = action === "pause" ? "paused" : action === "cancel" ? "canceled" : action === "resume" ? "authorized" : "pending";
        const result = await updateMercadoPagoSubscription(
          config,
          business.mercadopago_preapproval_id,
          { status },
        );
        if (!result.ok) return Response.json({ error: result.errorMessage ?? "Mercado Pago rechazó el cambio" }, { status: 502 });

        const localStatus = action === "cancel" ? "canceled" : action === "pause" ? "paused" : action === "resume" ? "active" : "pending";
        await (await import("@/integrations/supabase/client.server")).supabaseAdmin
          .from("businesses")
          .update({
            subscription_status: localStatus,
            ...(action === "cancel" ? { plan: "starter" } : {}),
          })
          .eq("id", businessId);

        return Response.json({ ok: true, status: localStatus });
      },
    },
  },
});
