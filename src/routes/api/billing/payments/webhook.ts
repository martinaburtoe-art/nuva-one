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

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await handlePaymentWebhook(supabaseAdmin as any, provider, token);
          // Los estados no definitivos y tokens desconocidos se responden 200;
          // los fallos internos/transitorios deben permitir un reintento del proveedor.
          return new Response("OK");
        } catch {
          return new Response("No se pudo procesar la notificación", { status: 503 });
        }
      },
    },
  },
});
