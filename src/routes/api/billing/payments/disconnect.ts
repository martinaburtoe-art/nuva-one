import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";

export const Route = createFileRoute("/api/billing/payments/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId)
          return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const { data: membership } = await client.from("business_members")
          .select("role").eq("business_id", businessId).maybeSingle();
        if (!membership || !["owner", "admin"].includes(String(membership.role))) {
          return new Response("Forbidden", { status: 403 });
        }

        const { error } = await client
          .from("billing_integrations")
          .update({ status: "disconnected" })
          .eq("business_id", businessId)
          .eq("type", "payment")
          .eq("status", "connected");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
