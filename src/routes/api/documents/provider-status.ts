import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/documents/provider-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return json({ error: "No autenticado" }, 401);
        const businessId = new URL(request.url).searchParams.get("business_id") || "";
        if (!businessId) return json({ error: "Falta el negocio" }, 400);
        const { data: membership } = await client.from("business_members")
          .select("role").eq("business_id", businessId).maybeSingle();
        if (!membership || !["owner", "admin"].includes(String(membership.role))) {
          return json({ error: "Sin permisos para consultar la configuración" }, 403);
        }
        const from = process.env.NUVA_DOCUMENTS_FROM_EMAIL?.trim() || "";
        const match = from.match(/@([^>\s]+)/);
        return json({
          resend_configured: Boolean(process.env.RESEND_API_KEY?.trim() && from),
          sender_domain: match?.[1]?.toLowerCase() ?? null,
          inngest_configured: Boolean(process.env.INNGEST_SIGNING_KEY?.trim()),
        });
      },
    },
  },
});
