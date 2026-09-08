import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 8_000;

export type NuvaN8nEvent = {
  id: string;
  business_id: string;
  actor_user_id: string | null;
  provider: "nuva";
  source: "nuva_one";
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  occurred_at: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
};

export function getN8nConfig() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim() ?? "";
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim() ?? "";
  return {
    configured: Boolean(webhookUrl && secret),
    webhookUrl,
    secret,
  };
}

function signatureFor(secret: string, timestamp: string, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function signN8nPayload(secret: string, timestamp: string, rawBody: string) {
  return `sha256=${signatureFor(secret, timestamp, rawBody)}`;
}

export function verifyN8nSignature(secret: string, timestamp: string, rawBody: string, signature: string) {
  const received = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = signatureFor(secret, timestamp, rawBody);
  if (!received || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function emitN8nEvent(event: NuvaN8nEvent, options?: { timeoutMs?: number }) {
  const config = getN8nConfig();
  if (!config.configured) {
    return { ok: false as const, status: 503, code: "N8N_NOT_CONFIGURED" };
  }

  const rawBody = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signN8nPayload(config.secret, timestamp, rawBody);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nuva-timestamp": timestamp,
        "x-nuva-signature": signature,
        "x-nuva-event-id": event.id,
        "x-nuva-idempotency-key": event.idempotency_key,
        "x-nuva-business-id": event.business_id,
      },
      body: rawBody,
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      code: response.ok ? "DELIVERED" : "N8N_REJECTED",
    } as const;
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      code: error instanceof Error && error.name === "AbortError" ? "N8N_TIMEOUT" : "N8N_UNREACHABLE",
    };
  } finally {
    clearTimeout(timeout);
  }
}
