import { getPaymentAdapter, decryptPaymentCreds } from "./payment-service.server";

export type SupabaseLike = {
  from: (table: "payment_webhook_events" | "payment_intents" | "billing_integrations") => any;
  rpc: (
    fn: "settle_payment_intent",
    args: {
      p_provider: string;
      p_token: string;
      p_provider_status: string;
      p_provider_amount: number | null;
      p_provider_commerce_order: string | null;
    },
  ) => Promise<{ data: any; error: any }>;
};

/**
 * Provider verification remains server-to-server. The verified result is
 * passed to a service-role-only Postgres RPC which atomically claims the
 * webhook, locks the intent and sale, and writes the payment exactly once.
 */
export async function handlePaymentWebhook(
  supabaseAdmin: SupabaseLike,
  provider: string,
  token: string,
): Promise<{ outcome: string }> {
  if (provider !== "flow" && provider !== "vsb") {
    return { outcome: "unsupported_provider" };
  }

  const { data: existingEvent, error: eventError } = await supabaseAdmin
    .from("payment_webhook_events")
    .select("processed")
    .eq("provider", provider)
    .eq("token", token)
    .maybeSingle();

  if (eventError) throw eventError;
  if (existingEvent?.processed) return { outcome: "already_processed" };

  const { data: intent, error: intentError } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("provider", provider)
    .eq("token", token)
    .maybeSingle();

  if (intentError) throw intentError;

  // Unknown tokens are not persisted: the public webhook endpoint must not
  // become an unbounded event-storage sink for arbitrary provider/token pairs.
  if (!intent) return { outcome: "unknown_token" };

  // A terminal intent needs no external round-trip. The RPC still serializes
  // the event and marks it processed under the same transaction.
  if (intent.status === "paid") {
    return settle(supabaseAdmin, provider, token, "paid", null, null);
  }
  if (intent.status === "rejected" || intent.status === "expired") {
    return settle(supabaseAdmin, provider, token, "rejected", null, null);
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

  if (!statusResult.ok) {
    // A transient provider error must produce HTTP 503 at the route so the
    // provider can retry; never acknowledge a status we could not verify.
    throw new Error("No se pudo verificar el estado del pago en el proveedor");
  }

  return settle(
    supabaseAdmin,
    provider,
    token,
    statusResult.status,
    statusResult.amount,
    statusResult.commerceOrder,
  );
}

async function settle(
  supabaseAdmin: SupabaseLike,
  provider: string,
  token: string,
  providerStatus: string,
  providerAmount: number | null,
  providerCommerceOrder: string | null,
): Promise<{ outcome: string }> {
  const { data, error } = await supabaseAdmin.rpc("settle_payment_intent", {
    p_provider: provider,
    p_token: token,
    p_provider_status: providerStatus,
    p_provider_amount: providerAmount,
    p_provider_commerce_order: providerCommerceOrder,
  });

  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return { outcome: result?.outcome ?? "settlement_unknown" };
}
