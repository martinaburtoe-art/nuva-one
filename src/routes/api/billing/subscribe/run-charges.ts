import { createFileRoute } from "@tanstack/react-router";
import {
  chargeSubscription,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";

// Se invoca una vez al día desde Vercel Cron (ver vercel.json). Cobra a
// cada negocio Pro cuyo next_charge_date ya llegó. Tras 3 rechazos
// consecutivos se degrada a Starter -- da margen para que el dueño
// actualice la tarjeta sin perder el acceso de golpe al primer rechazo
// (una tarjeta puede fallar por un solo mes sin fondos, por ejemplo).
const MAX_FAILED_ATTEMPTS = 3;

export const Route = createFileRoute("/api/billing/subscribe/run-charges")({
  server: {
    handlers: {
      // Vercel Cron invoca por GET. Si CRON_SECRET está seteado en el
      // proyecto, Vercel agrega automáticamente el header Authorization
      // con ese valor -- por eso igual lo verificamos acá, para que nadie
      // más pueda disparar cobros masivos golpeando esta URL a mano.
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");
        if (!secret || authHeader !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const creds = getFlowSubscriptionCreds();
        const priceCLP = Number(process.env.NUVA_PRO_PRICE_CLP ?? "29990");
        if (!creds)
          return new Response(JSON.stringify({ error: "Suscripciones no configuradas" }), {
            status: 500,
          });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);

        const { data: dueBusinesses, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, flow_customer_id, billing_failed_attempts")
          .eq("plan", "pro")
          .eq("flow_card_status", "active")
          .lte("next_charge_date", today);

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        const results: Array<{ businessId: string; status: string }> = [];

        for (const biz of dueBusinesses ?? []) {
          const customerId = (biz as any).flow_customer_id as string | null;
          if (!customerId) continue;

          const commerceOrder = `sub-${biz.id}-${Date.now()}`;
          const charge = await chargeSubscription(creds, {
            customerId,
            amount: priceCLP,
            subject: "Nüva One — Plan Pro (mensual)",
            commerceOrder,
          });

          await supabaseAdmin.from("subscription_charges").insert({
            business_id: biz.id,
            commerce_order: commerceOrder,
            amount: priceCLP,
            status: charge.status,
            flow_order: charge.flowOrder,
          });

          if (charge.status === "paid") {
            const next = new Date();
            next.setMonth(next.getMonth() + 1);
            await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: "active",
                billing_failed_attempts: 0,
                next_charge_date: next.toISOString().slice(0, 10),
              })
              .eq("id", biz.id);
            results.push({ businessId: biz.id, status: "paid" });
          } else {
            const attempts = ((biz as any).billing_failed_attempts ?? 0) + 1;
            const downgrade = attempts >= MAX_FAILED_ATTEMPTS;
            await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: downgrade ? "canceled" : "past_due",
                billing_failed_attempts: attempts,
                plan: downgrade ? "starter" : "pro",
                // Reintenta en 3 días si aún no se agotaron los intentos.
                next_charge_date: downgrade
                  ? null
                  : new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
              })
              .eq("id", biz.id);
            results.push({
              businessId: biz.id,
              status: downgrade ? "downgraded" : "retry_scheduled",
            });
          }
        }

        return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
