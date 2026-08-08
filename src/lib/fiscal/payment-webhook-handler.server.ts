import { getPaymentAdapter, decryptPaymentCreds } from "./payment-service.server";

// Subconjunto del cliente de Supabase que esta función necesita -- permite
// inyectar un mock en tests sin depender del cliente real.
export type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Procesa una notificación de pago (Flow/VSB) de forma idempotente y
 * segura: SIEMPRE verifica el estado real contra el proveedor
 * (server-to-server) antes de aplicar un abono, nunca confía en el POST
 * recibido por sí solo. Puede llamarse repetidas veces con el mismo
 * (provider, token) sin duplicar el abono.
 */
export async function handlePaymentWebhook(
  supabaseAdmin: SupabaseLike,
  provider: string,
  token: string,
): Promise<{ outcome: string }> {
  const { data: existingEvent } = await supabaseAdmin
    .from("payment_webhook_events")
    .select("id, processed")
    .eq("provider", provider)
    .eq("token", token)
    .maybeSingle();

  if (existingEvent?.processed) {
    return { outcome: "already_processed" };
  }

  if (!existingEvent) {
    await supabaseAdmin.from("payment_webhook_events").insert({
      provider,
      token,
      received_at: new Date().toISOString(),
    });
  }

  const { data: intent } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("provider", provider)
    .eq("token", token)
    .maybeSingle();

  if (!intent) return { outcome: "unknown_token" };

  if (intent.status === "paid") {
    await supabaseAdmin
      .from("payment_webhook_events")
      .update({ processed: true })
      .eq("provider", provider)
      .eq("token", token);
    return { outcome: "already_paid" };
  }

  const { data: integration } = await supabaseAdmin
    .from("billing_integrations")
    .select("*")
    .eq("business_id", intent.business_id)
    .eq("type", "payment")
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();

  if (!integration) return { outcome: "no_integration" };

  const adapter = getPaymentAdapter(provider);
  if (!adapter) return { outcome: "no_adapter" };

  const { apiKey, secretKey } = decryptPaymentCreds(integration as any);
  const statusResult = await adapter.checkStatus(
    {
      apiKey,
      secretKey,
      apiUrl: (integration as any).api_url || "",
      environment: (integration as any).environment,
    },
    token,
  );

  if (statusResult.status === "paid") {
    if (intent.sale_id) {
      await supabaseAdmin.from("payments").insert({
        business_id: intent.business_id,
        sale_id: intent.sale_id,
        amount: intent.amount,
        method: provider,
      });
    }
    await supabaseAdmin
      .from("payment_intents")
      .update({ status: "paid", resolved_at: new Date().toISOString() })
      .eq("provider", provider)
      .eq("token", token);
  } else if (statusResult.status === "rejected") {
    await supabaseAdmin
      .from("payment_intents")
      .update({ status: "rejected", resolved_at: new Date().toISOString() })
      .eq("provider", provider)
      .eq("token", token);
  } else {
    // "pending"/"unknown": el estado todavía no es definitivo. A propósito
    // NO marcamos processed=true acá -- si Flow reintenta la notificación
    // más tarde (o si el pago se confirma después), este mismo token debe
    // poder volver a verificarse contra el proveedor en vez de quedar
    // congelado como "ya procesado" sin haberse resuelto nunca.
    return { outcome: `resolved_${statusResult.status}` };
  }

  await supabaseAdmin
    .from("payment_webhook_events")
    .update({ processed: true })
    .eq("provider", provider)
    .eq("token", token);

  return { outcome: `resolved_${statusResult.status}` };
}
