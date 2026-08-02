import { createFileRoute } from "@tanstack/react-router";
import { getActiveFiscalIntegration, emitFiscalDocument } from "@/lib/fiscal/fiscal-service.server";
import { rutForSii } from "@/lib/rut";
import type { NormalizedSale } from "@/lib/fiscal/types";

const REQUIRE_RECEPTOR = new Set([33, 34]);

export const Route = createFileRoute("/api/billing/sii/emit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const tipoDte = Number(body.tipo_dte);
        const items = Array.isArray(body.items) ? body.items : [];
        const saleId = body.sale_id ? String(body.sale_id) : null;
        const customerId = body.customer_id ? String(body.customer_id) : null;
        const receptor = body.receptor as NormalizedSale["receptor"] | undefined;
        // Idempotencia: el cliente (o el flujo "Vender") debe mandar la
        // misma Idempotency-Key ante un reintento de red; si no la manda,
        // se deriva de sale_id para no duplicar por doble click.
        const idempotencyKey =
          request.headers.get("idempotency-key") || (saleId ? `sale:${saleId}` : `manual:${crypto.randomUUID()}`);

        if (!tipoDte || items.length === 0) {
          return new Response(JSON.stringify({ error: "Faltan ítems o tipo de documento" }), { status: 400 });
        }
        if (REQUIRE_RECEPTOR.has(tipoDte) && (!receptor?.rut || !receptor?.name)) {
          return new Response(
            JSON.stringify({ error: "La factura requiere RUT y razón social del receptor" }),
            { status: 400 },
          );
        }

        const result = await getActiveFiscalIntegration(request, businessId ?? null);
        if ("error" in result) return result.error;
        const { client, integration } = result;

        const sale: NormalizedSale = {
          tipoDte,
          items,
          receptor: receptor?.rut ? { ...receptor, rut: rutForSii(receptor.rut) } : receptor,
          saleId,
          customerId,
          idempotencyKey,
        };

        const out = await emitFiscalDocument(client, integration, businessId as string, sale);
        if ("error" in out) return out.error;

        if (out.deduped) {
          return new Response(JSON.stringify({ ok: true, deduped: true, document: out.document }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!out.ok) {
          return new Response(JSON.stringify({ error: (out.document as any)?.error_message, document: out.document }), {
            status: 207,
          });
        }
        return new Response(JSON.stringify({ ok: true, document: out.document }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
