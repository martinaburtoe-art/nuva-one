import { createFileRoute } from "@tanstack/react-router";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";

// Flow y VSB llaman aquí (urlConfirmation/webhook_url) cuando el pago se
// confirma. Regla de oro: el POST recibido NUNCA se trata como verdad --
// solo dispara una consulta server-to-server firmada (checkStatus) al
// proveedor, y solo esa respuesta puede marcar un pago como confirmado.
// Esto evita que alguien falsifique una notificación golpeando este
// endpoint directamente.
export const Route = createFileRoute("/api/billing/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "flow";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const form = await request.formData().catch(() => null);
        const token = form?.get("token")?.toString();
        if (!token) return new Response("Falta token", { status: 400 });

        // Idempotencia dura: si ya procesamos este (provider, token), no
        // repetimos el abono aunque el proveedor reintente la notificación
        // varias veces (Flow reintenta si no respondemos 200 rápido).
        const { data: existingEvent } = await supabaseAdmin
          .from("payment_webhook_events")
          .select("id, processed")
          .eq("provider", provider)
          .eq("token", token)
          .maybeSingle();

        if (existingEvent?.processed) {
          return new Response("OK");
        }

        if (!existingEvent) {
          await supabaseAdmin.from("payment_webhook_events").insert({
            provider,
            token,
            received_at: new Date().toISOString(),
          });
        }

        // Buscamos el intento de pago que nosotros mismos creamos en
        // /payments/create -- ahí sabemos a qué negocio pertenece y con qué
        // credenciales consultar el estado real.
        const { data: intent } = await supabaseAdmin
          .from("payment_intents")
          .select("*")
          .eq("provider", provider)
          .eq("token", token)
          .maybeSingle();

        if (!intent) {
          // Notificación de un token que no reconocemos: no hacemos nada,
          // pero respondemos 200 para que el proveedor no siga reintentando.
          return new Response("OK");
        }
        if (intent.status === "paid") {
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ processed: true })
            .eq("provider", provider)
            .eq("token", token);
          return new Response("OK");
        }

        const { data: integration } = await supabaseAdmin
          .from("billing_integrations")
          .select("*")
          .eq("business_id", intent.business_id)
          .eq("type", "payment")
          .eq("provider", provider)
          .eq("status", "connected")
          .maybeSingle();

        if (!integration) return new Response("OK");

        const adapter = getPaymentAdapter(provider);
        if (!adapter) return new Response("OK");

        const { apiKey, secretKey } = decryptPaymentCreds(integration as any);
        const statusResult = await adapter.checkStatus(
          {
            apiKey,
            secretKey,
            apiUrl: (integration as any).api_url || "",
            environment: (integration as any).environment,
          },
          token,
        );

        if (statusResult.status === "paid") {
          // El trigger apply_payment_to_sale en la tabla `payments` suma
          // paid_amount en la venta automáticamente (LEAST(total, ...) evita
          // sobrepasar el total aunque este webhook se dispare más de una vez
          // antes de que el intent quede marcado como pagado).
          if (intent.sale_id) {
            await supabaseAdmin.from("payments").insert({
              business_id: intent.business_id,
              sale_id: intent.sale_id,
              amount: intent.amount,
              method: provider,
            });
          }
          await supabaseAdmin
            .from("payment_intents")
            .update({ status: "paid", resolved_at: new Date().toISOString() })
            .eq("provider", provider)
            .eq("token", token);
        } else if (statusResult.status === "rejected") {
          await supabaseAdmin
            .from("payment_intents")
            .update({ status: "rejected", resolved_at: new Date().toISOString() })
            .eq("provider", provider)
            .eq("token", token);
        }
        // status "pending"/"unknown": no tocamos nada, puede llegar otra
        // notificación más adelante o el usuario puede reconsultar.

        await supabaseAdmin
          .from("payment_webhook_events")
          .update({ processed: true })
          .eq("provider", provider)
          .eq("token", token);

        return new Response("OK");
      },
    },
  },
});
