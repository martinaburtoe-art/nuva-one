import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient, openFacturaBaseUrl } from "@/lib/billing-sii-auth.server";

export const Route = createFileRoute("/api/billing/sii/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const apiKey = String(body.api_key || "").trim();
        const environment = body.environment === "prod" ? "prod" : "dev";
        if (!businessId || !apiKey) {
          return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        // Confirma membresía del negocio (RLS): si no es miembro, esto no
        // devuelve fila y cortamos aquí antes de gastar una llamada externa.
        const { data: biz } = await client
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .maybeSingle();
        if (!biz) return new Response("Unauthorized", { status: 401 });

        try {
          const orgRes = await fetch(`${openFacturaBaseUrl(environment)}/v2/dte/organization`, {
            headers: { apikey: apiKey },
          });
          if (!orgRes.ok) {
            return new Response(
              JSON.stringify({ error: "API Key inválida o sin acceso en ese ambiente" }),
              { status: 400 },
            );
          }
          const org = await orgRes.json();
          const primeraActividad = org.actividades?.[0];

          const { error: upsertError } = await client.from("billing_integrations" as any).upsert(
            {
              business_id: businessId,
              provider: "openfactura",
              status: "connected",
              environment,
              api_key: apiKey,
              rut: org.rut ?? null,
              razon_social: org.razonSocial ?? null,
              giro: primeraActividad?.actividadEconomica ?? org.glosaDescriptiva ?? null,
              acteco: primeraActividad?.codigoActividadEconomica?.toString() ?? null,
              direccion: org.direccion ?? null,
              comuna: org.comuna ?? null,
              cdg_sii_sucur: org.cdgSIISucur ?? null,
              connected_at: new Date().toISOString(),
            },
            { onConflict: "business_id,provider" },
          );
          if (upsertError) {
            return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
          }

          return new Response(
            JSON.stringify({
              ok: true,
              razon_social: org.razonSocial,
              rut: org.rut,
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch {
          return new Response(JSON.stringify({ error: "No se pudo contactar a OpenFactura" }), {
            status: 502,
          });
        }
      },
    },
  },
});
