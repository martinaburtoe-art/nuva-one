import { createFileRoute } from "@tanstack/react-router";
import { getSiiIntegration, openFacturaBaseUrl } from "@/lib/billing-sii-auth.server";

type Item = { name: string; qty: number; price: number };

// TipoDTE del SII: 33 factura afecta, 34 factura exenta, 39 boleta afecta,
// 41 boleta exenta. Boleta no requiere Receptor completo; factura sí.
const REQUIRE_RECEPTOR = new Set([33, 34]);

export const Route = createFileRoute("/api/billing/sii/emit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const tipoDte = Number(body.tipo_dte);
        const items = (Array.isArray(body.items) ? body.items : []) as Item[];
        const saleId = body.sale_id ? String(body.sale_id) : null;
        const customerId = body.customer_id ? String(body.customer_id) : null;
        const receptor = body.receptor as
          | { rut?: string; name?: string; giro?: string; address?: string; comuna?: string }
          | undefined;

        if (!tipoDte || items.length === 0) {
          return new Response(JSON.stringify({ error: "Faltan ítems o tipo de documento" }), {
            status: 400,
          });
        }
        if (REQUIRE_RECEPTOR.has(tipoDte) && (!receptor?.rut || !receptor?.name)) {
          return new Response(
            JSON.stringify({ error: "La factura requiere RUT y razón social del receptor" }),
            { status: 400 },
          );
        }

        const result = await getSiiIntegration(request, businessId ?? null);
        if ("error" in result) return result.error;
        const { client, integration } = result;

        // Montos de venta chilena habitualmente incluyen IVA; separamos neto/IVA
        // para el Encabezado.Totales que exige el SII. Ver nota de la UI: revisa
        // estos cálculos con tu contador antes de emitir en producción.
        const grossTotal = items.reduce((s, it) => s + it.qty * it.price, 0);
        const netAmount = Math.round(grossTotal / 1.19);
        const ivaAmount = grossTotal - netAmount;

        const dte = {
          Encabezado: {
            IdDoc: {
              TipoDTE: tipoDte,
              Folio: 0,
              FchEmis: new Date().toISOString().slice(0, 10),
              FmaPago: 1,
            },
            Emisor: {
              RUTEmisor: integration.rut,
              RznSoc: integration.razon_social,
              GiroEmis: integration.giro,
              Acteco: integration.acteco ? Number(integration.acteco) : undefined,
              DirOrigen: integration.direccion,
              CmnaOrigen: integration.comuna,
              CdgSIISucur: integration.cdg_sii_sucur,
            },
            ...(receptor?.rut
              ? {
                  Receptor: {
                    RUTRecep: receptor.rut,
                    RznSocRecep: receptor.name,
                    GiroRecep: receptor.giro || "Sin giro informado",
                    DirRecep: receptor.address || undefined,
                    CmnaRecep: receptor.comuna || undefined,
                  },
                }
              : {}),
            Totales: {
              MntNeto: netAmount,
              TasaIVA: "19",
              IVA: ivaAmount,
              MntTotal: grossTotal,
            },
          },
          Detalle: items.map((it, i) => ({
            NroLinDet: i + 1,
            NmbItem: it.name.slice(0, 80),
            QtyItem: it.qty,
            PrcItem: it.price,
            MontoItem: it.qty * it.price,
          })),
        };

        try {
          const res = await fetch(`${openFacturaBaseUrl(integration.environment)}/v2/dte/document`, {
            method: "POST",
            headers: {
              apikey: integration.api_key || "",
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify({ response: ["PDF", "FOLIO"], dte }),
          });
          const json = await res.json().catch(() => ({}));

          const row = {
            business_id: businessId,
            sale_id: saleId,
            customer_id: customerId,
            tipo_dte: tipoDte,
            folio: json?.FOLIO ?? json?.folio ?? null,
            environment: integration.environment,
            status: res.ok ? "emitted" : "error",
            receptor_rut: receptor?.rut ?? null,
            receptor_name: receptor?.name ?? null,
            net_amount: netAmount,
            iva_amount: ivaAmount,
            total: grossTotal,
            pdf_base64: json?.PDF ?? json?.pdf ?? null,
            error_message: res.ok ? null : json?.message || "Error al emitir",
            raw_response: json,
          };

          const { data: saved, error: saveError } = await client
            .from("billing_documents" as any)
            .insert(row)
            .select()
            .single();
          if (saveError) {
            return new Response(JSON.stringify({ error: saveError.message }), { status: 500 });
          }

          if (!res.ok) {
            return new Response(JSON.stringify({ error: row.error_message, document: saved }), {
              status: 207,
            });
          }
          return new Response(JSON.stringify({ ok: true, document: saved }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ error: "No se pudo contactar a OpenFactura" }), {
            status: 502,
          });
        }
      },
    },
  },
});
