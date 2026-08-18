import { createFileRoute } from "@tanstack/react-router";
import {
  getCardRegisterStatus,
  chargeSubscription,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";

// Flow llama aquí (url_return de customer/register) tras el registro de
// tarjeta. El POST recibido nunca es la verdad: se re-consulta server-to-server.
// Este endpoint es público por diseño, por lo que el business_id del query
// string NO es suficiente para autorizar una operación financiera.
export const Route = createFileRoute("/api/billing/subscribe/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const creds = getFlowSubscriptionCreds();
        const configuredPrice = Number(process.env.NUVA_PRO_PRICE_CLP ?? "29990");
        const priceCLP = Number.isSafeInteger(configuredPrice) && configuredPrice > 0 ? configuredPrice : 29990;

        const url = new URL(request.url);
        const businessId = url.searchParams.get("business_id");
        const form = await request.formData().catch(() => null);
        const token = form?.get("token")?.toString();

        const redirect = (status: "success" | "error", message?: string) =>
          new Response(null, {
            status: 303,
            headers: {
              "Cache-Control": "no-store",
              Location: `${siteUrl}/settings?upgrade=${status}${message ? `&msg=${encodeURIComponent(message)}` : ""}`,
            },
          });

        if (!creds || !businessId || !token) return redirect("error", "Datos incompletos");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: business } = await supabaseAdmin
          .from("businesses")
          .select("id,flow_customer_id")
          .eq("id", businessId)
          .maybeSingle();

        // The callback URL is attacker-controlled. Require a real Flow customer
        // already bound to this business before performing any write or charge.
        if (!business?.flow_customer_id) return redirect("error", "Suscripción no válida");

        const status = await getCardRegisterStatus(creds, token);
        if (
          !status.ok ||
          !status.active ||
          !status.customerId ||
          status.customerId !== business.flow_customer_id
        ) {
          await supabaseAdmin
            .from("businesses")
            .update({ flow_card_status: "failed" })
            .eq("id", businessId)
            .eq("flow_customer_id", business.flow_customer_id);
          return redirect("error", "No se pudo registrar la tarjeta");
        }

        await supabaseAdmin
          .from("businesses")
          .update({ flow_card_status: "active" })
          .eq("id", businessId)
          .eq("flow_customer_id", status.customerId);

        // Deterministic monthly order prevents replay/concurrent callbacks from
        // creating a new Flow order for the same business and billing period.
        const period = new Date().toISOString().slice(0, 7);
        const commerceOrder = `sub-${businessId}-${period}`;

        const { data: existing } = await supabaseAdmin
          .from("subscription_charges")
          .select("status,flow_order")
          .eq("commerce_order", commerceOrder)
          .maybeSingle();

        if (existing?.status === "paid") {
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
            .eq("id", businessId)
            .eq("flow_customer_id", status.customerId);
          return redirect("success");
        }

        if (existing?.status === "processing") return redirect("error", "Cobro en proceso");

        // Reserve the order before calling Flow. A unique commerce_order makes
        // concurrent/replayed callbacks converge on the same billing attempt.
        const { error: reserveError } = await supabaseAdmin
          .from("subscription_charges")
          .insert({
            business_id: businessId,
            commerce_order: commerceOrder,
            amount: priceCLP,
            status: "processing",
          });

        if (reserveError) {
          const { data: raced } = await supabaseAdmin
            .from("subscription_charges")
            .select("status")
            .eq("commerce_order", commerceOrder)
            .maybeSingle();
          if (raced?.status === "paid") return redirect("success");
          return redirect("error", "Cobro en proceso");
        }

        const charge = await chargeSubscription(creds, {
          customerId: status.customerId,
          amount: priceCLP,
          subject: "Nüva One — Plan Pro (mensual)",
          commerceOrder,
        });

        await supabaseAdmin
          .from("subscription_charges")
          .update({
            status: charge.status,
            flow_order: charge.flowOrder,
            attempt_started_at: new Date().toISOString(),
          })
          .eq("commerce_order", commerceOrder)
          .eq("business_id", businessId);

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
          .eq("id", businessId)
          .eq("flow_customer_id", status.customerId);

        return redirect("success");
      },
    },
  },
});
