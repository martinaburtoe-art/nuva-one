import { createFileRoute } from "@tanstack/react-router";
import {
  getCardRegisterStatus,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";
import { NUVA_PLANS } from "@/lib/plan-config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/billing/subscribe/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const creds = getFlowSubscriptionCreds();
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

        if (!creds || !businessId || !UUID_RE.test(businessId) || !token || token.length > 512) {
          return redirect("error", "Datos incompletos");
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: business } = await supabaseAdmin
          .from("businesses")
          .select("id,flow_customer_id")
          .eq("id", businessId)
          .maybeSingle();
        if (!business?.flow_customer_id) return redirect("error", "Suscripción no válida");

        const status = await getCardRegisterStatus(creds, token);
        if (
          !status.ok ||
          !status.active ||
          !status.customerId ||
          status.customerId !== business.flow_customer_id
        ) {
          // Never mutate the target business on an untrusted callback. A valid
          // token for another customer could otherwise be used to force a
          // victim's card status to "failed" if their business ID were known.
          return redirect("error", "No se pudo registrar la tarjeta");
        }

        await supabaseAdmin
          .from("businesses")
          .update({ flow_card_status: "active" })
          .eq("id", businessId)
          .eq("flow_customer_id", status.customerId);

        // Registering a card is not itself a successful payment. The recurring
        // billing worker owns charges and provisions/retains Pro only after a
        // paid charge. This prevents a replayed registration callback from
        // granting paid features without a successful payment.
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
          await supabaseAdmin
            .from("businesses")
            .update({
              plan: NUVA_PLANS.pro.id,
              subscription_status: "active",
              billing_failed_attempts: 0,
              next_charge_date: nextChargeDate.toISOString().slice(0, 10),
            })
            .eq("id", businessId)
            .eq("flow_customer_id", status.customerId);
          return redirect("success");
        }

        // Keep the business on its current plan until the billing worker records
        // a successful charge. The configured Pro price is sourced from the
        // central plan catalog, not a duplicated environment fallback.
        await supabaseAdmin
          .from("businesses")
          .update({
            flow_card_status: "active",
            subscription_status: "pending",
            next_charge_date: new Date().toISOString().slice(0, 10),
          })
          .eq("id", businessId)
          .eq("flow_customer_id", status.customerId);

        return redirect(
          "success",
          `Tarjeta registrada. Plan Pro: ${NUVA_PLANS.pro.monthlyPriceClp} CLP/mes.`,
        );
      },
    },
  },
});
