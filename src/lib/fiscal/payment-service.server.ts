import { decryptSecret } from "./crypto.server";
import { flowAdapter } from "./adapters/flow.server";
import { vsbAdapter } from "./adapters/vsb.server";
import type { PaymentAdapter, PaymentProvider } from "./types";

const PAYMENT_ADAPTERS: Record<PaymentProvider, PaymentAdapter> = {
  flow: flowAdapter,
  vsb: vsbAdapter,
};

export function getPaymentAdapter(provider: string): PaymentAdapter | null {
  return PAYMENT_ADAPTERS[provider as PaymentProvider] ?? null;
}

export function decryptPaymentCreds(row: { api_key: string | null; secret_key: string | null }) {
  return { apiKey: decryptSecret(row.api_key), secretKey: decryptSecret(row.secret_key) };
}
