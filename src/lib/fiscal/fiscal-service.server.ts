import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { decryptSecret } from "./crypto.server";
import { openFacturaAdapter } from "./adapters/openfactura.server";
import { libreDteAdapter } from "./adapters/libredte.server";
import type { FiscalAdapter, FiscalIntegrationRow, FiscalProvider, NormalizedSale } from "./types";

const ADAPTERS: Record<FiscalProvider, FiscalAdapter> = {
  openfactura: openFacturaAdapter,
  libredte: libreDteAdapter,
};

export function getFiscalAdapter(provider: string): FiscalAdapter | null {
  return ADAPTERS[provider as FiscalProvider] ?? null;
}

export async function authedUserClient(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const { url, anonKey } = getServerSupabaseEnv();
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return client;
}

/** Trae el proveedor fiscal activo del negocio, sea cual sea (OpenFactura o
 * LibreDTE): el resto del sistema nunca hardcodea un proveedor específico. */
export async function getActiveFiscalIntegration(
  request: Request,
  businessId: string | null,
): Promise<
  | { error: Response }
  | { client: NonNullable<Awaited<ReturnType<typeof authedUserClient>>>; integration: FiscalIntegrationRow }
> {
  if (!businessId) return { error: new Response("business_id requerido", { status: 400 }) };
  const client = await authedUserClient(request);
  if (!client) return { error: new Response("Unauthorized", { status: 401 }) };

  const { data, error } = await client
    .from("billing_integrations")
    .select("*")
    .eq("business_id", businessId)
    .eq("type", "fiscal")
    .eq("status", "connected")
    .maybeSingle();

  if (error || !data) return { error: new Response("No hay proveedor fiscal conectado", { status: 404 }) };
  const row = data as unknown as FiscalIntegrationRow;
  return { client, integration: { ...row, api_key: decryptSecret(row.api_key) } };
}

/** Emite un documento con idempotencia real: inserta primero la fila con el
 * idempotency_key (constraint UNIQUE la protege ante reintentos/carreras) y
 * solo si eso tuvo éxito llama al proveedor externo. Si la fila ya existía,
 * devuelve el documento guardado sin volver a llamar a la API externa. */
export async function emitFiscalDocument(
  client: NonNullable<Awaited<ReturnType<typeof authedUserClient>>>,
  integration: FiscalIntegrationRow,
  businessId: string,
  sale: NormalizedSale,
) {
  const { data: existing } = await client
    .from("billing_documents")
    .select("*")
    .eq("business_id", businessId)
    .eq("idempotency_key", sale.idempotencyKey)
    .maybeSingle();
  if (existing) return { document: existing, deduped: true as const };

  const adapter = getFiscalAdapter(integration.provider);
  if (!adapter) return { error: new Response("Proveedor fiscal no soportado", { status: 400 }) };

  const grossTotal = sale.items.reduce((s, it) => s + it.qty * it.price, 0);
  const netAmount = Math.round(grossTotal / 1.19);
  const ivaAmount = grossTotal - netAmount;

  // Fila "en progreso" primero: si dos requests llegan con el mismo
  // idempotency_key en paralelo, el UNIQUE constraint hace fallar al segundo
  // insert y evitamos emitir el documento tributario dos veces.
  const { data: placeholder, error: insertError } = await client
    .from("billing_documents")
    .insert({
      business_id: businessId,
      sale_id: sale.saleId,
      customer_id: sale.customerId,
      provider: integration.provider,
      tipo_dte: sale.tipoDte,
      environment: integration.environment,
      status: "processing",
      idempotency_key: sale.idempotencyKey,
      receptor_rut: sale.receptor?.rut ?? null,
      receptor_name: sale.receptor?.name ?? null,
      net_amount: netAmount,
      iva_amount: ivaAmount,
      total: grossTotal,
    })
    .select()
    .single();

  if (insertError || !placeholder) {
    // Carrera perdida: alguien más ya insertó con este idempotency_key.
    const { data: raced } = await client
      .from("billing_documents")
      .select("*")
      .eq("business_id", businessId)
      .eq("idempotency_key", sale.idempotencyKey)
      .maybeSingle();
    if (raced) return { document: raced, deduped: true as const };
    return { error: new Response(insertError?.message || "Error al preparar el documento", { status: 500 }) };
  }

  const result = await adapter.emit(integration, sale);

  const { data: saved } = await client
    .from("billing_documents")
    .update({
      status: result.ok ? "emitted" : "error",
      folio: result.folio,
      pdf_base64: result.pdfBase64,
      error_message: result.errorMessage,
      raw_response: result.raw,
    })
    .eq("id", (placeholder as any).id)
    .select()
    .single();

  return { document: saved ?? placeholder, deduped: false as const, ok: result.ok };
}
