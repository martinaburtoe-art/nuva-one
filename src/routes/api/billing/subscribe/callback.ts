import { createFileRoute } from "@tanstack/react-router";
import {
  getCardRegisterStatus,
  chargeSubscription,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";

// Flow llama aquí (url_return de customer/register) tras el registro de
// tarjeta. Regla de siempre: el POST recibido no es la verdad -- se
// re-consulta server-to-server con getRegisterStatus antes de activar nada.
export const Route = createFileRoute("/api/billing/subscribe/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const creds = getFlowSubscriptionCreds();
        const priceCLP = Number(process.env.NUVA_PRO_PRICE_CLP ?? "29990");

        const url = new URL(request.url);
        const businessId = url.searchParams.get("business_id");
        const form = await request.formData().catch(() => null);
        const token = form?.get("token")?.toString();

        const redirect = (status: "success" | "error", message?: string) =>
          new Response(null, {
            status: 303,
            headers: {
              Location: `${siteUrl}/settings?upgrade=${status}${message ? `&msg=${encodeURIComponent(message)}` : ""}`,
            },
          });

        if (!creds || !businessId || !token) return redirect("error", "Datos incompletos");

        const status = await getCardRegisterStatus(creds, token);
        if (!status.ok || !status.active || !status.customerId) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("businesses")
            .update({ flow_card_status: "failed" })
            .eq("id", businessId);
          return redirect("error", "No se pudo registrar la tarjeta");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("businesses")
          .update({ flow_card_status: "active", flow_customer_id: status.customerId })
          .eq("id", businessId);

        // Primer cobro inmediato -- customer/charge es síncrono, no hace
        // falta esperar otro webhook para saber si se aprobó.
        const commerceOrder = `sub-${businessId}-${Date.now()}`;
        const charge = await chargeSubscription(creds, {
          customerId: status.customerId,
          amount: priceCLP,
          subject: "Nüva One — Plan Pro (mensual)",
          commerceOrder,
        });

        await supabaseAdmin.from("subscription_charges").insert({
          business_id: businessId,
          commerce_order: commerceOrder,
          amount: priceCLP,
          status: charge.status,
          flow_order: charge.flowOrder,
        });

        if (charge.status !== "paid") {
          return redirect("error", "La tarjeta fue rechazada en el primer cobro");
        }

        const nextChargeDate = new Date();
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        await supabaseAdmin
          .from("businesses")
          .update({
            plan: "pro",
            subscription_status: "active",
            billing_failed_attempts: 0,
            next_charge_date: nextChargeDate.toISOString().slice(0, 10),
          })
          .eq("id", businessId);

        return redirect("success");
      },
    },
  },
});
