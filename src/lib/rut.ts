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

/** Calcula el dígito verificador (DV) de un RUT chileno a partir del cuerpo numérico.
 *  Algoritmo modulo 11: multiplica cada dígito de derecha a izquierda por
 *  2,3,4,5,6,7 (repitiendo), suma, y DV = 11 - (suma % 11); 11→0, 10→K.
 *  Devuelve "0"-"9" o "K". Lanza si el cuerpo no es numérico o está vacío. */
export function calculateDv(body: string): string {
  const digits = cleanRut(body).replace(/k$/i, "");
  if (!digits || !/^\d+$/.test(digits)) {
    throw new Error("El cuerpo del RUT debe contener solo dígitos.");
  }
  let sum = 0;
  let multiplier = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const dv = 11 - (sum % 11);
  if (dv === 11) return "0";
  if (dv === 10) return "K";
  return String(dv);
}

/** Valida que un RUT chileno tenga dígito verificador correcto (modulo 11).
 *  Acepta formatos con o sin puntos/guion, mayúsculas o minúsculas. */
export function validateRut(value: string): boolean {
  const clean = cleanRut(value);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  try {
    return calculateDv(body) === dv;
  } catch {
    return false;
  }
}
