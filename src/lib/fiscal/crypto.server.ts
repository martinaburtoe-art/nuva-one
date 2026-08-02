import crypto from "node:crypto";

// Cifra api_key/secret_key de cada proveedor antes de guardarlas en la DB.
// Clave maestra fija en env (Vercel), 32 bytes en base64. Nunca se loguea.
function masterKey(): Buffer {
  const raw = process.env.FISCAL_CREDENTIALS_KEY;
  if (!raw) throw new Error("FISCAL_CREDENTIALS_KEY no configurada");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FISCAL_CREDENTIALS_KEY debe ser 32 bytes (base64)");
  return key;
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(stored: string | null): string {
  if (!stored) return "";
  const parts = stored.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return stored; // dato legado sin cifrar
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
