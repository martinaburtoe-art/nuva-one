import type { FiscalAdapter, FiscalIntegrationRow, NormalizedSale, EmitResult } from "../types";

// LibreDTE expone su propia API REST (nube o self-hosted); por eso, a
// diferencia de OpenFactura, cada negocio ingresa también su api_url.
function baseUrl(integrationApiUrl?: string | null): string {
  return (integrationApiUrl && integrationApiUrl.trim()) || "https://libredte.cl/api";
}

export const libreDteAdapter: FiscalAdapter = {
  async connect({ apiKey, apiUrl }) {
    try {
      const res = await fetch(`${baseUrl(apiUrl)}/contribuyentes/situacion_tributaria`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: "API Key/URL inválida para LibreDTE" };
      const info = await res.json().catch(() => ({}));
      return {
        ok: true,
        org: {
          rut: info?.rut ?? null,
          razon_social: info?.razon_social ?? info?.RznSoc ?? null,
          giro: info?.giro ?? null,
          direccion: info?.direccion ?? null,
          comuna: info?.comuna ?? null,
        },
      };
    } catch {
      return { ok: false, error: "No se pudo contactar a LibreDTE" };
    }
  },

  async emit(integration: FiscalIntegrationRow, sale: NormalizedSale): Promise<EmitResult> {
    const grossTotal = sale.items.reduce((s, it) => s + it.qty * it.price, 0);
    const netAmount = Math.round(grossTotal / 1.19);
    const ivaAmount = grossTotal - netAmount;

    // Formato EnvioDTE simplificado del generador de documentos de LibreDTE.
    const documento = {
      Encabezado: {
        IdDoc: { TipoDTE: sale.tipoDte, FchEmis: new Date().toISOString().slice(0, 10) },
        Emisor: { RUTEmisor: integration.rut, RznSoc: integration.razon_social, GiroEmis: integration.giro },
        ...(sale.receptor?.rut
          ? { Receptor: { RUTRecep: sale.receptor.rut, RznSocRecep: sale.receptor.name } }
          : {}),
        Totales: { MntNeto: netAmount, IVA: ivaAmount, MntTotal: grossTotal },
      },
      Detalle: sale.items.map((it, i) => ({
        NroLinDet: i + 1,
        NmbItem: it.name.slice(0, 80),
        QtyItem: it.qty,
        PrcItem: it.price,
      })),
    };

    try {
      const res = await fetch(`${baseUrl(integration.api_url)}/dte/documentos/generar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.api_key || ""}`,
          "Content-Type": "application/json",
          "Idempotency-Key": sale.idempotencyKey,
        },
        body: JSON.stringify({ documento }),
      });
      const json = await res.json().catch(() => ({}));
      return {
        ok: res.ok,
        folio: json?.folio ?? null,
        pdfBase64: json?.pdf ?? null,
        errorMessage: res.ok ? null : json?.message || "Error al emitir en LibreDTE",
        raw: json,
      };
    } catch {
      return { ok: false, folio: null, pdfBase64: null, errorMessage: "No se pudo contactar a LibreDTE", raw: null };
    }
  },
};
