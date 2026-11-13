import { getPaymentAdapter, decryptPaymentCreds } from "./payment-service.server";

export type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Verifica siempre el estado directamente con el proveedor. La aplicación
 * transaccional del abono se endurecerá en la siguiente migración atómica;
 * aquí cerramos primero la validación de identidad e importe del cobro.
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

  if (existingEvent?.processed) return { outcome: "already_processed" };

  if (!existingEvent) {
    const { error } = await supabaseAdmin.from("payment_webhook_events").insert({
      provider,
      token,
      received_at: new Date().toISOString(),
    });
    // Una colisión por notificaciones simultáneas es esperable por el índice
    // único. Otros errores no deben ocultarse: el endpoint responderá 503.
    if (error && !String(error.code ?? "").includes("23505")) throw error;
  }

  const { data: intent, error: intentError } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("provider", provider)
    .eq("token", token)
    .maybeSingle();

  if (intentError) throw intentError;
  if (!intent) return { outcome: "unknown_token" };

  if (intent.status === "paid") {
    await supabaseAdmin
      .from("payment_webhook_events")
      .update({ processed: true })
      .eq("provider", provider)
      .eq("token", token);
    return { outcome: "already_paid" };
  }

  const { data: integration, error: integrationError } = await supabaseAdmin
    .from("billing_integrations")
    .select("*")
    .eq("business_id", intent.business_id)
    .eq("type", "payment")
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();

  if (integrationError) throw integrationError;
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

  if (!statusResult.ok) return { outcome: "provider_unavailable" };

  if (statusResult.status === "paid") {
    // Un token válido no basta: el importe y la referencia deben coincidir
    // con el intento local. Se falla cerrado si el proveedor no entrega ambos.
    const providerAmount =
      statusResult.amount === null ? null : Math.round(Number(statusResult.amount));
    const intentAmount = Math.round(Number(intent.amount));
    if (
      !statusResult.commerceOrder ||
      statusResult.commerceOrder !== intent.commerce_order ||
      providerAmount === null ||
      !Number.isFinite(providerAmount) ||
      providerAmount !== intentAmount
    ) {
      return { outcome: "provider_mismatch" };
    }

    if (intent.sale_id) {
      const { error: paymentError } = await supabaseAdmin.from("payments").insert({
        business_id: intent.business_id,
        sale_id: intent.sale_id,
        amount: intent.amount,
        method: provider,
      });
      if (paymentError) throw paymentError;
    }
    const { error: updateError } = await supabaseAdmin
      .from("payment_intents")
      .update({ status: "paid", resolved_at: new Date().toISOString() })
      .eq("provider", provider)
      .eq("token", token);
    if (updateError) throw updateError;
  } else if (statusResult.status === "rejected") {
    const { error: updateError } = await supabaseAdmin
      .from("payment_intents")
      .update({ status: "rejected", resolved_at: new Date().toISOString() })
      .eq("provider", provider)
      .eq("token", token);
    if (updateError) throw updateError;
  } else {
    return { outcome: `resolved_${statusResult.status}` };
  }

  const { error: eventError } = await supabaseAdmin
    .from("payment_webhook_events")
    .update({ processed: true })
    .eq("provider", provider)
    .eq("token", token);
  if (eventError) throw eventError;

  return { outcome: `resolved_${statusResult.status}` };
}
