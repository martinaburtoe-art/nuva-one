import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";

// Recibe N ventas (ej: cierre de caja del día) y solo las encola; el worker
// process-queue.ts las va emitiendo de a poco respetando el rate limit del
// proveedor. La UI no espera a que terminen de emitirse todas.
export const Route = createFileRoute("/api/billing/sii/emit-bulk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const sales = Array.isArray(body.sales) ? body.sales : [];
        if (!businessId || sales.length === 0) {
          return new Response(JSON.stringify({ error: "Faltan ventas a facturar" }), { status: 400 });
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const rows = sales.map((s: any) => ({
          business_id: businessId,
          sale_id: s.sale_id ?? null,
          idempotency_key: s.sale_id ? `sale:${s.sale_id}` : `bulk:${crypto.randomUUID()}`,
          payload: s,
          status: "pending",
        }));

        const { data, error } = await client
          .from("billing_emit_queue")
          .upsert(rows, { onConflict: "business_id,idempotency_key", ignoreDuplicates: true })
          .select("id");

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        return new Response(JSON.stringify({ ok: true, queued: data?.length ?? 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
