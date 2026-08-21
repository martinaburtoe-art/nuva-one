import { createFileRoute } from "@tanstack/react-router";
import { chargeSubscription, getFlowSubscriptionCreds } from "@/lib/fiscal/flow-subscriptions.server";
import { NUVA_PLANS } from "@/lib/plan-config";

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
        if (!creds) {
          return new Response(JSON.stringify({ error: "Suscripciones no configuradas" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);
        const period = today.slice(0, 7);
        const staleBefore = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000).toISOString();
        const parsedPrice = NUVA_PLANS.pro.monthlyPriceClp;

        // Pending subscriptions are card-registered but not yet paid. Active Pro
        // subscriptions are recurring charges. Both must enter the same idempotent
        // charge pipeline; only a paid result provisions/retains Pro.
        const { data: dueBusinesses, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, flow_customer_id, billing_failed_attempts, plan, subscription_status")
          .eq("flow_card_status", "active")
          .lte("next_charge_date", today)
          .or("subscription_status.eq.pending,and(subscription_status.eq.active,plan.eq.pro)");

        if (error) {
          console.error("subscription_charge_query_failed", error);
          return new Response(JSON.stringify({ error: "No se pudieron cargar las suscripciones" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }

        const results: Array<{ businessId: string; status: string }> = [];

        for (const biz of dueBusinesses ?? []) {
          const customerId = biz.flow_customer_id as string | null;
          if (!customerId) continue;

          // One charge per business/month. Keeping the same commerce order in the
          // callback and worker makes reconciliation deterministic and idempotent.
          const commerceOrder = `sub-${biz.id}-${period}`;

          const { data: existing } = await supabaseAdmin
            .from("subscription_charges")
            .select("id,status,attempt_started_at")
            .eq("commerce_order", commerceOrder)
            .maybeSingle();

          if (existing?.status === "paid" || existing?.status === "rejected") {
            results.push({ businessId: biz.id, status: `already_${existing.status}` });
            continue;
          }

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
              if (reserveError.code === "23505") {
                results.push({ businessId: biz.id, status: "already_processing" });
                continue;
              }
              console.error("subscription_charge_reservation_failed", reserveError);
              results.push({ businessId: biz.id, status: "reservation_failed" });
              continue;
            }
          } else {
            const { data: reclaimed, error: reclaimError } = await supabaseAdmin
              .from("subscription_charges")
              .update({ attempt_started_at: new Date().toISOString() })
              .eq("id", existing.id)
              .eq("status", "processing")
              .lt("attempt_started_at", staleBefore)
              .select("id")
              .maybeSingle();

            if (reclaimError) {
              console.error("subscription_charge_reclaim_failed", reclaimError);
              results.push({ businessId: biz.id, status: "reclaim_failed" });
              continue;
            }
            if (!reclaimed) {
              results.push({ businessId: biz.id, status: "already_processing" });
              continue;
            }
          }

          const charge = await chargeSubscription(creds, {
            customerId,
            amount: parsedPrice,
            subject: "Nüva One — Plan Pro (mensual)",
            commerceOrder,
          });

          const { error: finalizeError } = await supabaseAdmin
            .from("subscription_charges")
            .update({
              status: charge.status,
              flow_order: charge.flowOrder,
              attempt_started_at: null,
            })
            .eq("commerce_order", commerceOrder)
            .eq("status", "processing");

          if (finalizeError) {
            console.error("subscription_charge_finalize_failed", finalizeError);
            results.push({ businessId: biz.id, status: "finalize_failed" });
            continue;
          }

          if (charge.status === "paid") {
            const next = new Date();
            next.setMonth(next.getMonth() + 1);
            await supabaseAdmin
              .from("businesses")
              .update({
                plan: NUVA_PLANS.pro.id,
                subscription_status: "active",
                billing_failed_attempts: 0,
                next_charge_date: next.toISOString().slice(0, 10),
              })
              .eq("id", biz.id)
              .eq("flow_card_status", "active");
            results.push({ businessId: biz.id, status: "paid" });
          } else {
            const attempts = (biz.billing_failed_attempts ?? 0) + 1;
            const downgrade = attempts >= MAX_FAILED_ATTEMPTS;
            await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: downgrade ? "canceled" : "past_due",
                billing_failed_attempts: attempts,
                plan: downgrade ? "starter" : biz.plan,
                next_charge_date: downgrade
                  ? null
                  : new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
              })
              .eq("id", biz.id)
              .eq("flow_card_status", "active");
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
