/** Utilidades de RUT chileno usadas en Caja, Clientes y Facturación SII. */

/** Deja solo dígitos y dígito verificador (K), sin puntos ni guion. */
export function cleanRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Formatea en vivo mientras se escribe: 111111111 -> 11.111.111-1 */
export function formatRut(value: string): string {
  const clean = cleanRut(value);
  if (!clean) return "";
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!body) return dv;
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d)$)/g, ".");
  return `${withDots}-${dv}`;
}

/** Para comparar/matchear dos RUT ignorando formato (puntos, guion, mayúsculas). */
export function normalizeRut(value: string): string {
  return cleanRut(value);
}

/** Formato sin puntos que suelen esperar las APIs de DTE del SII (12345678-9). */
export function rutForSii(value: string): string {
  const clean = cleanRut(value);
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}
