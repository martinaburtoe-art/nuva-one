export type PaymentProvider = "flow" | "vsb";
export type IntegrationType = "payment";

export type PaymentIntent = {
  amount: number;
  subject: string;
  commerceOrder: string; // referencia interna (idempotencia)
  email?: string;
  returnUrl: string;
  webhookUrl: string;
};

export type PaymentResult = {
  ok: boolean;
  paymentUrl: string | null;
  token: string | null;
  errorMessage: string | null;
  raw: any;
};

export interface PaymentAdapter {
  createPayment(
    params: {
      apiKey: string;
      secretKey: string;
      apiUrl: string;
      environment: "dev" | "prod";
    },
    intent: PaymentIntent,
  ): Promise<PaymentResult>;
}
