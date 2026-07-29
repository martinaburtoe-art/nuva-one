// Normalizes a WhatsApp number to the digits-only format Meta's Cloud API
// uses in the `from`/`to` fields of webhook payloads (e.g. "56912345678",
// no "+", spaces, or punctuation). Used on both the link form (client) and
// the webhook lookup (server) so a number typed as "+56 9 1234 5678" still
// matches the one Meta reports as "56912345678".
export function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

// Light validation for the link form: enough digits to be a real mobile
// number with country code (e.g. Chile: 56 9 XXXX XXXX = 11 digits).
export function isPlausiblePhoneNumber(raw: string): boolean {
  const digits = normalizeWhatsAppNumber(raw);
  return digits.length >= 8 && digits.length <= 15;
}
