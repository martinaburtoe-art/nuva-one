export type FiscalProvider = "openfactura" | "libredte";
export type PaymentProvider = "flow" | "vsb";
export type IntegrationType = "fiscal" | "payment";

export type SaleItem = { name: string; qty: number; price: number };

export type Receptor = {
  rut?: string;
  name?: string;
  giro?: string;
  address?: string;
  comuna?: string;
};

// Estructura normalizada que entra al FiscalService, agnóstica de proveedor.
// Construida en el endpoint /emit a partir de la venta de confección.
export type NormalizedSale = {
  tipoDte: number; // 33 factura, 34 factura exenta, 39 boleta, 41 boleta exenta
  items: SaleItem[];
  receptor?: Receptor;
  saleId: string | null;
  customerId: string | null;
  idempotencyKey: string;
};

export type FiscalIntegrationRow = {
  id: string;
  business_id: string;
  provider: FiscalProvider;
  status: string;
  environment: "dev" | "prod";
  api_key: string | null;
  api_url: string | null;
  secret_key: string | null;
  config: Record<string, any> | null;
  rut: string | null;
  razon_social: string | null;
  giro: string | null;
  acteco: string | null;
  direccion: string | null;
  comuna: string | null;
  cdg_sii_sucur: string | null;
};

export type EmitResult = {
  ok: boolean;
  folio: number | null;
  pdfBase64: string | null;
  errorMessage: string | null;
  raw: any;
};

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

export interface FiscalAdapter {
  connect(params: {
    apiKey: string;
    apiUrl?: string;
    environment: "dev" | "prod";
  }): Promise<{ ok: true; org: Record<string, any> } | { ok: false; error: string }>;
  emit(integration: FiscalIntegrationRow, sale: NormalizedSale): Promise<EmitResult>;
}

export interface PaymentAdapter {
  createPayment(params: {
    apiKey: string;
    secretKey: string;
    apiUrl: string;
    environment: "dev" | "prod";
  }, intent: PaymentIntent): Promise<PaymentResult>;
}
