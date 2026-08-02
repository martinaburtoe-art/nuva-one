import type { FiscalAdapter, FiscalIntegrationRow, NormalizedSale, EmitResult } from "../types";

const REQUIRE_RECEPTOR = new Set([33, 34]);

function baseUrl(environment: string): string {
  return environment === "prod" ? "https://api.haulmer.com" : "https://dev-api.haulmer.com";
}

export const openFacturaAdapter: FiscalAdapter = {
  async connect({ apiKey, environment }) {
    try {
      const res = await fetch(`${baseUrl(environment)}/v2/dte/organization`, {
        headers: { apikey: apiKey },
      });
      if (!res.ok) return { ok: false, error: "API Key inválida o sin acceso en ese ambiente" };
      const org = await res.json();
      const primeraActividad = org.actividades?.[0];
      return {
        ok: true,
        org: {
          rut: org.rut ?? null,
          razon_social: org.razonSocial ?? null,
          giro: primeraActividad?.actividadEconomica ?? org.glosaDescriptiva ?? null,
          acteco: primeraActividad?.codigoActividadEconomica?.toString() ?? null,
          direccion: org.direccion ?? null,
          comuna: org.comuna ?? null,
          cdg_sii_sucur: org.cdgSIISucur ?? null,
        },
      };
    } catch {
      return { ok: false, error: "No se pudo contactar a OpenFactura" };
    }
  },

  async emit(integration: FiscalIntegrationRow, sale: NormalizedSale): Promise<EmitResult> {
    const grossTotal = sale.items.reduce((s, it) => s + it.qty * it.price, 0);
    const netAmount = Math.round(grossTotal / 1.19);
    const ivaAmount = grossTotal - netAmount;

    const dte = {
      Encabezado: {
        IdDoc: {
          TipoDTE: sale.tipoDte,
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
        ...(sale.receptor?.rut && REQUIRE_RECEPTOR.has(sale.tipoDte)
          ? {
              Receptor: {
                RUTRecep: sale.receptor.rut,
                RznSocRecep: sale.receptor.name,
                GiroRecep: sale.receptor.giro || "Sin giro informado",
                DirRecep: sale.receptor.address || undefined,
                CmnaRecep: sale.receptor.comuna || undefined,
              },
            }
          : {}),
        Totales: { MntNeto: netAmount, TasaIVA: "19", IVA: ivaAmount, MntTotal: grossTotal },
      },
      Detalle: sale.items.map((it, i) => ({
        NroLinDet: i + 1,
        NmbItem: it.name.slice(0, 80),
        QtyItem: it.qty,
        PrcItem: it.price,
        MontoItem: it.qty * it.price,
      })),
    };

    try {
      const res = await fetch(`${baseUrl(integration.environment)}/v2/dte/document`, {
        method: "POST",
        headers: {
          apikey: integration.api_key || "",
          "Content-Type": "application/json",
          "Idempotency-Key": sale.idempotencyKey,
        },
        body: JSON.stringify({ response: ["PDF", "FOLIO"], dte }),
      });
      const json = await res.json().catch(() => ({}));
      return {
        ok: res.ok,
        folio: json?.FOLIO ?? json?.folio ?? null,
        pdfBase64: json?.PDF ?? json?.pdf ?? null,
        errorMessage: res.ok ? null : json?.message || "Error al emitir en OpenFactura",
        raw: json,
      };
    } catch {
      return { ok: false, folio: null, pdfBase64: null, errorMessage: "No se pudo contactar a OpenFactura", raw: null };
    }
  },
};
