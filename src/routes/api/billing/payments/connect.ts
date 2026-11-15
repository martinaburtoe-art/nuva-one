import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { encryptSecret } from "@/lib/fiscal/crypto.server";
import { validateFlowCredentials } from "@/lib/fiscal/adapters/flow.server";

// El negocio pega sus credenciales de Flow (apiKey + secretKey) o VSB
// (apiKey + apiUrl) desde Ajustes/Finanzas. Se guardan cifradas
// (AES-256-GCM) y nunca se devuelven en texto plano en ninguna respuesta.
export const Route = createFileRoute("/api/billing/payments/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const provider = String(body.provider || "");
        const apiKey = String(body.api_key || "").trim();
        const secretKey = body.secret_key ? String(body.secret_key).trim() : "";
        const apiUrl = body.api_url ? String(body.api_url).trim() : null;
        const environment = body.environment === "prod" ? "prod" : "dev";

        if (!businessId || !apiKey) {
          return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
        }
        if (provider !== "flow" && provider !== "vsb") {
          return new Response(JSON.stringify({ error: "Proveedor de pago no soportado" }), {
            status: 400,
          });
        }
        if (provider === "flow" && !secretKey) {
          return new Response(JSON.stringify({ error: "Flow requiere secretKey" }), {
            status: 400,
          });
        }
        if (provider === "vsb" && !apiUrl) {
          return new Response(JSON.stringify({ error: "VSB requiere api_url" }), { status: 400 });
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        // Only owners/admins may manage payment credentials.
        const { data: membership } = await client
          .from("business_members")
          .select("role")
          .eq("business_id", businessId)
          .maybeSingle();
        if (!membership || !["owner", "admin"].includes(String(membership.role))) {
          return new Response("Forbidden", { status: 403 });
        }

        // Validate Flow credentials with a read-only API call BEFORE touching
        // the existing integration. No test checkout or charge is created.
        if (provider === "flow") {
          const validation = await validateFlowCredentials({ apiKey, secretKey, environment });
          if (!validation.ok) {
            return new Response(JSON.stringify({
              error: validation.message ?? "No se pudieron validar las credenciales Flow.",
              code: "FLOW_CREDENTIALS_INVALID",
            }), { status: 422, headers: { "Content-Type": "application/json" } });
          }
        }

        // Nunca deben quedar dos pasarelas de pago "connected" a la vez
        // (el índice parcial de la DB también lo impide, esto es defensivo).
        const { error: disconnectError } = await client
          .from("billing_integrations")
          .update({ status: "disconnected" })
          .eq("business_id", businessId)
          .eq("type", "payment")
          .eq("status", "connected");
        if (disconnectError) {
          return new Response(JSON.stringify({ error: "No se pudo reemplazar la integración activa." }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        const { error: upsertError } = await client.from("billing_integrations").upsert(
          {
            business_id: businessId,
            provider,
            type: "payment",
            status: "connected",
            environment,
            api_key: encryptSecret(apiKey),
            secret_key: secretKey ? encryptSecret(secretKey) : null,
            api_url: apiUrl,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "business_id,provider" },
        );
        if (upsertError) {
          return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ ok: true, provider }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
