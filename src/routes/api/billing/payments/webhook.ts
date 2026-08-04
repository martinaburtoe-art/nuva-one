import { createFileRoute } from "@tanstack/react-router";

// Flow y VSB llaman aquí (urlConfirmation/webhook_url) cuando el pago se
// confirma. Actualiza la venta asociada; no dependemos de que el cliente
// vuelva a la pestaña (urlReturn), solo de esta confirmación server-to-server.
export const Route = createFileRoute("/api/billing/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "flow";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const form = await request.formData().catch(() => null);
        const token = form?.get("token")?.toString();
        // NOTA: en producción, antes de marcar como pagado, se debe llamar a
        // GET /payment/getStatus (Flow) o al endpoint equivalente de VSB con
        // el token para verificar el estado real firmado por el proveedor,
        // en vez de confiar ciegamente en el POST recibido.
        if (!token) return new Response("Falta token", { status: 400 });

        await supabaseAdmin.from("payment_webhook_events").insert({
          provider,
          token,
          received_at: new Date().toISOString(),
        }).select().maybeSingle();

        return new Response("OK");
      },
    },
  },
});
