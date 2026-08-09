import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";

// Cancela la suscripción Pro: downgrade inmediato a Starter (no hay
// "período ya pagado que se aprovecha", el cobro es simple mes a mes).
// La tarjeta queda registrada en Flow por si el negocio reactiva después.
export const Route = createFileRoute("/api/billing/subscribe/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return new Response("business_id requerido", { status: 400 });

        // RLS (vía el client con el JWT del usuario) confirma que el
        // caller realmente pertenece a este negocio -- recién después se
        // usa supabaseAdmin para el UPDATE real, porque plan/
        // subscription_status son columnas bloqueadas para el rol
        // authenticated (ver migración lock_billing_columns): nadie puede
        // dárselas a sí mismo con su propio JWT, ni siquiera el dueño.
        const { data: business, error: bizError } = await client
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business)
          return new Response("Negocio no encontrado o sin acceso", { status: 403 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("businesses")
          .update({ plan: "starter", subscription_status: "canceled", next_charge_date: null })
          .eq("id", businessId);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
