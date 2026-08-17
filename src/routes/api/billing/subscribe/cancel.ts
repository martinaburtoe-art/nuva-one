import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";

const MP_API = "https://api.mercadopago.com";

export const Route = createFileRoute("/api/billing/subscribe/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return new Response("business_id requerido", { status: 400 });

        const { data: business, error: bizError } = await client
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business) return new Response("Negocio no encontrado o sin acceso", { status: 403 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceRoleKey) return new Response(JSON.stringify({ error: "Supabase no configurado" }), { status: 500 });
        const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

        const { data: subscription } = await admin
          .from("billing_subscriptions")
          .select("id, provider_subscription_id")
          .eq("business_id", businessId)
          .eq("provider", "mercadopago")
          .in("status", ["pending", "active", "paused", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscription?.provider_subscription_id) {
          const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
          if (!token) return new Response(JSON.stringify({ error: "Mercado Pago no configurado" }), { status: 500 });
          const response = await fetch(`${MP_API}/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: "canceled" }),
          });
          if (!response.ok) {
            console.error("Mercado Pago cancellation failed", response.status, await response.text());
            return new Response(JSON.stringify({ error: "Mercado Pago no pudo cancelar la suscripción" }), { status: 502 });
          }
          await admin.from("billing_subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("id", subscription.id);
        }

        const { error } = await admin
          .from("businesses")
          .update({ plan: "starter", subscription_status: "canceled", next_charge_date: null })
          .eq("id", businessId);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
