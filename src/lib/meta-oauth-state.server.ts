import { createHmac, timingSafeEqual } from "node:crypto";

// Firma "business_id.expiración.hmac" para pasar por el parámetro `state`
// del OAuth de Meta sin depender de cookies/sesión (el callback lo recibe
// como redirect del navegador, sin Authorization header). Evita que alguien
// arme un state con un business_id ajeno y vincule su cuenta de Facebook a
// un negocio que no le pertenece.
function secret(): string {
  return process.env.META_APP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function signMetaState(businessId: string): string {
  const exp = Date.now() + 10 * 60 * 1000; // 10 min
  const payload = `${businessId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyMetaState(state: string): { businessId: string } | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [businessId, expStr, sig] = parts;
  const payload = `${businessId}.${expStr}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(expStr)) return null;
  return { businessId };
}
