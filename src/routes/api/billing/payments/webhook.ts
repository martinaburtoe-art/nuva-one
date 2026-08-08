import { createFileRoute } from "@tanstack/react-router";
import { handlePaymentWebhook } from "@/lib/fiscal/payment-webhook-handler.server";

// Flow y VSB llaman aquí (urlConfirmation/webhook_url) cuando el pago se
// confirma. Regla de oro: el POST recibido NUNCA se trata como verdad --
// solo dispara una consulta server-to-server firmada (checkStatus) al
// proveedor, y solo esa respuesta puede marcar un pago como confirmado.
// Esto evita que alguien falsifique una notificación golpeando este
// endpoint directamente. La lógica completa vive en
// payment-webhook-handler.server.ts para poder testearla sin un servidor
// HTTP real (ver src/lib/fiscal/payment-webhook-handler.server.test.ts).
export const Route = createFileRoute("/api/billing/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "flow";

        const form = await request.formData().catch(() => null);
        const token = form?.get("token")?.toString();
        if (!token) return new Response("Falta token", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await handlePaymentWebhook(supabaseAdmin, provider, token);

        // Siempre 200 para que el proveedor no reintente indefinidamente;
        // los casos "no reconocido"/"sin integración" quedan en el log de
        // payment_webhook_events para revisar manualmente si hace falta.
        return new Response("OK");
      },
    },
  },
});
