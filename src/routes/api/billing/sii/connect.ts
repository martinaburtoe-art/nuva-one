import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { getFiscalAdapter } from "@/lib/fiscal/fiscal-service.server";
import { encryptSecret } from "@/lib/fiscal/crypto.server";

// Endpoint agnóstico: el negocio elige su proveedor (openfactura|libredte)
// en el módulo de Ajustes y pega su propia api_key (+ api_url si aplica).
export const Route = createFileRoute("/api/billing/sii/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const provider = String(body.provider || "openfactura");
        const apiKey = String(body.api_key || "").trim();
        const apiUrl = body.api_url ? String(body.api_url).trim() : null;
        const environment = body.environment === "prod" ? "prod" : "dev";
        if (!businessId || !apiKey) {
          return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
        }

        const adapter = getFiscalAdapter(provider);
        if (!adapter) {
          return new Response(JSON.stringify({ error: "Proveedor fiscal no soportado" }), { status: 400 });
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const { data: biz } = await client
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .maybeSingle();
        if (!biz) return new Response("Unauthorized", { status: 401 });

        const result = await adapter.connect({ apiKey, apiUrl: apiUrl ?? undefined, environment });
        if (!result.ok) {
          return new Response(JSON.stringify({ error: result.error }), { status: 400 });
        }

        // Desconecta cualquier proveedor fiscal previo del negocio antes de
        // activar el nuevo: nunca deben quedar dos proveedores "connected"
        // al mismo tiempo (folios/credenciales no deben mezclarse).
        await client
          .from("billing_integrations")
          .update({ status: "disconnected" })
          .eq("business_id", businessId)
          .eq("type", "fiscal")
          .eq("status", "connected");

        const { error: upsertError } = await client.from("billing_integrations").upsert(
          {
            business_id: businessId,
            provider,
            type: "fiscal",
            status: "connected",
            environment,
            api_key: encryptSecret(apiKey),
            api_url: apiUrl,
            ...result.org,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "business_id,provider" },
        );
        if (upsertError) {
          return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
        }

        return new Response(
          JSON.stringify({ ok: true, provider, razon_social: result.org.razon_social, rut: result.org.rut }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
