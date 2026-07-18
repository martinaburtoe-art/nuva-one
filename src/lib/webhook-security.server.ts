import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a "sha256=<hex>"-style HMAC signature header, as used by Meta's
 * Cloud API (x-hub-signature-256) and similar providers.
 *
 * Uses timingSafeEqual instead of === specifically to avoid timing attacks
 * that could let an attacker guess the correct signature byte-by-byte.
 *
 * Extracted out of the whatsapp webhook route so it can be unit tested in
 * isolation and reused by any future webhook that signs payloads the same way.
 */
export function verifyHmacSha256Signature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);

  // timingSafeEqual throws if buffers differ in length, so we short-circuit
  // first -- this length check leaks length info, not content, and is the
  // same trade-off Meta's own reference implementations make.
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
