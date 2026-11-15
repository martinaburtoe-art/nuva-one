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
