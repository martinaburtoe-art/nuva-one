export type QuoteMailtoOptions = {
  recipient: string;
  quoteNumber: number | string | null | undefined;
  customerName: string;
  totalLabel: string;
  shareUrl: string;
  expiresAt: string;
};

/**
 * Builds a truthful local email hand-off when the server email provider is
 * not configured. It never marks the delivery as sent; the user sends it
 * from their own mail client.
 */
export function buildQuoteMailtoUrl(options: QuoteMailtoOptions): string {
  const quoteLabel = `COT-${String(options.quoteNumber ?? "").padStart(4, "0")}`;
  const expiryLabel = new Date(options.expiresAt).toLocaleDateString("es-CL");
  const subject = `Cotización ${quoteLabel} · ${options.customerName}`;
  const body = [
    `Hola ${options.customerName},`,
    "",
    `Te comparto la cotización ${quoteLabel}.`,
    `Total: ${options.totalLabel}`,
    "",
    "Puedes revisar el detalle y responder desde este enlace seguro:",
    options.shareUrl,
    "",
    `El enlace vence el ${expiryLabel}.`,
    "",
    "Saludos.",
  ].join("\n");

  return `mailto:${encodeURIComponent(options.recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type InvoiceMailtoOptions = {
  recipient: string;
  invoiceNumber: number | string;
  customerName: string;
  totalLabel: string;
  balanceLabel: string;
};

/**
 * Prepares a local email draft after the invoice PDF is downloaded.
 * The user must attach the PDF and explicitly send the message.
 */
export function buildInvoiceMailtoUrl(options: InvoiceMailtoOptions): string {
  const invoiceLabel = `FAC-${String(options.invoiceNumber).padStart(6, "0")}`;
  const subject = `Documento de cobro ${invoiceLabel} · ${options.customerName}`;
  const body = [
    `Hola ${options.customerName},`,
    "",
    `Adjunto el documento comercial de cobro ${invoiceLabel}.`,
    `Total: ${options.totalLabel}`,
    `Saldo pendiente: ${options.balanceLabel}`,
    "",
    "El PDF se descargó en tu dispositivo. Adjunta ese archivo antes de enviar este correo.",
    "Este documento es comercial interno y no constituye un DTE ni una factura tributaria del SII.",
    "",
    "Saludos.",
  ].join("\n");

  return `mailto:${encodeURIComponent(options.recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
