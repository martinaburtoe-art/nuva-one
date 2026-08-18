import { createFileRoute } from "@tanstack/react-router";
import {
  chargeSubscription,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";

const MAX_FAILED_ATTEMPTS = 3;
const STALE_PROCESSING_MINUTES = 30;

export const Route = createFileRoute("/api/billing/subscribe/run-charges")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");
        if (!secret || authHeader !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const creds = getFlowSubscriptionCreds();
        const parsedPrice = Number(process.env.NUVA_PRO_PRICE_CLP ?? "29990");
        if (!creds || !Number.isSafeInteger(parsedPrice) || parsedPrice <= 0) {
          return new Response(JSON.stringify({ error: "Suscripciones no configuradas" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);

        const { data: dueBusinesses, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, flow_customer_id, billing_failed_attempts")
          .eq("plan", "pro")
          .eq("flow_card_status", "active")
          .lte("next_charge_date", today);

        if (error) {
          console.error("subscription_charge_query_failed", error);
          return new Response(JSON.stringify({ error: "No se pudieron cargar las suscripciones" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const results: Array<{ businessId: string; status: string }> = [];

        for (const biz of dueBusinesses ?? []) {
          const customerId = biz.flow_customer_id as string | null;
          if (!customerId) continue;

          // Deterministic order per business/day. This is also the provider-level
          // idempotency key: concurrent/retried executions must never invent a
          // new commerce order for the same billing date.
          const commerceOrder = `sub-${biz.id}-${today}`;

          const { data: existing } = await supabaseAdmin
            .from("subscription_charges")
            .select("id,status,created_at")
            .eq("commerce_order", commerceOrder)
            .maybeSingle();

          if (existing?.status === "paid" || existing?.status === "rejected") {
            results.push({ businessId: biz.id, status: `already_${existing.status}` });
            continue;
          }

          // Atomically reserve the commerce order before contacting Flow. The
          // unique commerce_order constraint prevents two cron invocations from
          // charging the same subscription concurrently.
          if (!existing) {
            const { error: reserveError } = await supabaseAdmin
              .from("subscription_charges")
              .insert({
                business_id: biz.id,
                commerce_order: commerceOrder,
                amount: parsedPrice,
                status: "processing",
                attempt_started_at: new Date().toISOString(),
              });

            if (reserveError) {
              // Another invocation won the reservation race.
              if (reserveError.code === "23505") {
                results.push({ businessId: biz.id, status: "already_processing" });
                continue;
              }
              console.error("subscription_charge_reservation_failed", reserveError);
              results.push({ businessId: biz.id, status: "reservation_failed" });
              continue;
            }
          } else {
            const startedAt = new Date(existing.created_at).getTime();
            const stale = Date.now() - startedAt > STALE_PROCESSING_MINUTES * 60_000;
            if (!stale) {
              results.push({ businessId: biz.id, status: "already_processing" });
              continue;
            }

            await supabaseAdmin
              .from("subscription_charges")
              .update({ attempt_started_at: new Date().toISOString() })
              .eq("id", existing.id)
              .eq("status", "processing");
          }

          const charge = await chargeSubscription(creds, {
            customerId,
            amount: parsedPrice,
            subject: "Nüva One — Plan Pro (mensual)",
            commerceOrder,
          });

          await supabaseAdmin
            .from("subscription_charges")
            .update({
              status: charge.status,
              flow_order: charge.flowOrder,
              attempt_started_at: null,
            })
            .eq("commerce_order", commerceOrder);

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
              .eq("id", biz.id)
              .eq("plan", "pro");
            results.push({ businessId: biz.id, status: "paid" });
          } else {
            const attempts = (biz.billing_failed_attempts ?? 0) + 1;
            const downgrade = attempts >= MAX_FAILED_ATTEMPTS;
            await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: downgrade ? "canceled" : "past_due",
                billing_failed_attempts: attempts,
                plan: downgrade ? "starter" : "pro",
                next_charge_date: downgrade
                  ? null
                  : new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
              })
              .eq("id", biz.id)
              .eq("plan", downgrade ? "pro" : "pro");
            results.push({
              businessId: biz.id,
              status: downgrade ? "downgraded" : "retry_scheduled",
            });
          }
        }

        return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
