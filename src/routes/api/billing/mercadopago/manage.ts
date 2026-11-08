import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { requireBusinessBillingManager } from "@/lib/fiscal/billing-access.server";
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

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const action = body.action as string | undefined;
        if (!businessId || !action) return Response.json({ error: "Datos incompletos" }, { status: 400 });
        if (!["pause", "resume", "cancel"].includes(action)) {
          return Response.json({ error: "Acción de suscripción no válida" }, { status: 400 });
        }

        const billingAccess = await requireBusinessBillingManager(client, businessId);
        if (!billingAccess.ok) {
          return Response.json({ error: billingAccess.error }, { status: billingAccess.status });
        }
        const { business } = billingAccess;

        if (business.billing_provider !== "mercadopago") {
          return Response.json({ error: "Este negocio no tiene una suscripción de Mercado Pago activa" }, { status: 409 });
        }
        if (!business.mercadopago_preapproval_id) {
          return Response.json({ error: "No existe una suscripción Mercado Pago vinculada" }, { status: 404 });
        }

        const allowed = await checkRateLimit(`mp-manage:${businessId}`, 20, 3600);
        if (!allowed) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429 });
        }

        const config = getMercadoPagoConfig();
        if (!config) return Response.json({ error: "Mercado Pago no está configurado" }, { status: 503 });

        const providerStatus = action === "pause" ? "paused" : action === "cancel" ? "canceled" : "authorized";
        const result = await updateMercadoPagoSubscription(
          config,
          business.mercadopago_preapproval_id,
          { status: providerStatus },
        );
        if (!result.ok) {
          return Response.json({ error: result.errorMessage ?? "Mercado Pago rechazó el cambio" }, { status: 502 });
        }

        const localStatus = action === "cancel" ? "canceled" : action === "pause" ? "paused" : "active";
        const pendingDemoOrTrial = action === "cancel" &&
          business.subscription_status === "pending" &&
          (
            business.plan === "pro" ||
            (business.plan === "starter" && new Date(business.created_at).getTime() > Date.now() - 15 * 86_400_000)
          );
        const localUpdate = action !== "cancel"
          ? { subscription_status: localStatus }
          : pendingDemoOrTrial
            ? { subscription_status: "active", billing_provider: "none", mercadopago_preapproval_id: null }
            : { plan: "starter", subscription_status: "canceled", next_charge_date: null };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: updateError } = await supabaseAdmin
          .from("businesses")
          .update(localUpdate)
          .eq("id", businessId);

        if (updateError) {
          console.error("[billing] Mercado Pago subscription changed but local state sync failed", {
            businessId,
            action,
            message: updateError.message,
          });
          return Response.json({
            error: "Mercado Pago confirmó el cambio, pero no pudimos sincronizarlo en Nüva One. Contacta soporte antes de volver a contratar.",
            code: "BILLING_STATE_SYNC_FAILED",
          }, { status: 500 });
        }

        return Response.json({ ok: true, status: localStatus });
      },
    },
  },
});
