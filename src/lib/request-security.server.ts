import crypto from "node:crypto";

/**
 * Returns a privacy-preserving, deterministic fingerprint for the client IP
 * as seen by Vercel's trusted proxy headers. The raw address is never stored
 * in the rate-limit table.
 */
export function getClientIpFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = (forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown").slice(0, 128);
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function jsonRequestTooLarge(request: Request, maxBytes: number): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;
  const length = Number(contentLength);
  return Number.isFinite(length) && length > maxBytes;
}
