import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { requireBusinessBillingManager } from "@/lib/fiscal/billing-access.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import {
  getMercadoPagoConfig,
  updateMercadoPagoSubscription,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

// Backwards-compatible cancellation endpoint. Cancellation is confirmed with
// Mercado Pago first; local access is downgraded only after provider success.
export const Route = createFileRoute("/api/billing/subscribe/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return Response.json({ error: "business_id requerido" }, { status: 400 });

        const billingAccess = await requireBusinessBillingManager(client, businessId);
        if (!billingAccess.ok) {
          return Response.json({ error: billingAccess.error }, { status: billingAccess.status });
        }
        const { business } = billingAccess;

        if (business.billing_provider !== "mercadopago" || !business.mercadopago_preapproval_id) {
          return Response.json({ error: "No existe una suscripción Mercado Pago activa para cancelar" }, { status: 409 });
        }

        const allowed = await checkRateLimit(`mp-manage:${businessId}`, 20, 3600);
        if (!allowed) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429 });
        }

        const config = getMercadoPagoConfig();
        if (!config) return Response.json({ error: "Mercado Pago no está configurado" }, { status: 503 });

        const result = await updateMercadoPagoSubscription(
          config,
          business.mercadopago_preapproval_id,
          { status: "canceled" },
        );
        if (!result.ok) {
          return Response.json({ error: result.errorMessage ?? "Mercado Pago rechazó la cancelación" }, { status: 502 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const pendingDemoOrTrial =
          business.subscription_status === "pending" &&
          (
            business.plan === "pro" ||
            (business.plan === "starter" && new Date(business.created_at).getTime() > Date.now() - 15 * 86_400_000)
          );
        const localUpdate = pendingDemoOrTrial
          ? { subscription_status: "active", billing_provider: "none", mercadopago_preapproval_id: null }
          : { plan: "starter", subscription_status: "canceled", next_charge_date: null };
        const { error } = await supabaseAdmin
          .from("businesses")
          .update(localUpdate)
          .eq("id", businessId);

        if (error) {
          console.error("[billing] Mercado Pago cancellation succeeded but local downgrade failed", {
            businessId,
            message: error.message,
          });
          return Response.json({
            error: "Mercado Pago canceló la suscripción, pero no pudimos sincronizar Nüva One. Contacta soporte antes de volver a contratar.",
            code: "BILLING_STATE_SYNC_FAILED",
          }, { status: 500 });
        }

        return Response.json({ ok: true, status: "canceled" });
      },
    },
  },
});
