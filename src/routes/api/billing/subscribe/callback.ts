import { createFileRoute } from "@tanstack/react-router";
import {
  getCardRegisterStatus,
  chargeSubscription,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";

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
        if (!business?.flow_customer_id) return redirect("error", "Suscripción no válida");

        const status = await getCardRegisterStatus(creds, token);
        if (!status.ok || !status.active || !status.customerId || status.customerId !== business.flow_customer_id) {
          await supabaseAdmin.from("businesses").update({ flow_card_status: "failed" }).eq("id", businessId).eq("flow_customer_id", business.flow_customer_id);
          return redirect("error", "No se pudo registrar la tarjeta");
        }

        await supabaseAdmin.from("businesses").update({ flow_card_status: "active" }).eq("id", businessId).eq("flow_customer_id", status.customerId);

        // The registration callback is a provisioning event, not a monthly billing event.
        // The scheduled billing worker owns recurring charges and therefore prevents a
        // replayed callback from charging the card unexpectedly.
        const period = new Date().toISOString().slice(0, 7);
        const commerceOrder = `sub-${businessId}-${period}`;
        const { data: existing } = await supabaseAdmin
          .from("subscription_charges")
          .select("status")
          .eq("commerce_order", commerceOrder)
          .maybeSingle();

        if (existing?.status === "paid") {
          const nextChargeDate = new Date();
          nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
          await supabaseAdmin.from("businesses").update({
            plan: "pro", subscription_status: "active", billing_failed_attempts: 0,
            next_charge_date: nextChargeDate.toISOString().slice(0, 10),
          }).eq("id", businessId).eq("flow_customer_id", status.customerId);
          return redirect("success");
        }

        await supabaseAdmin.from("businesses").update({
          flow_card_status: "active", plan: "pro", subscription_status: "active",
          billing_failed_attempts: 0,
          next_charge_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }).eq("id", businessId).eq("flow_customer_id", status.customerId);

        return redirect("success");
      },
    },
  },
});
