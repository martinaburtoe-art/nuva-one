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
  /** Consulta el estado real del pago directamente al proveedor (server-to-
   * server, firmado). Nunca se debe marcar un pago como confirmado solo por
   * el POST/redirect recibido del navegador o del webhook sin esta
   * verificación. */
  checkStatus(
    params: {
      apiKey: string;
      secretKey: string;
      apiUrl: string;
      environment: "dev" | "prod";
    },
    token: string,
  ): Promise<PaymentStatusResult>;
}

export type PaymentStatusResult = {
  ok: boolean;
  status: "paid" | "pending" | "rejected" | "unknown";
  commerceOrder: string | null;
  amount: number | null;
  raw: any;
};
