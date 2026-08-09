import crypto from "node:crypto";

// Cobro de la suscripción Pro de Nüva One (lo que el NEGOCIO le paga a
// Nüva One), separado del adapter de payment/create (lo que los clientes
// del negocio le pagan al negocio). Usa las credenciales propias de Nüva
// One (env vars), no las de cada negocio.

function baseUrl(environment: string): string {
  return environment === "prod" ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";
}

function sign(params: Record<string, string>, secretKey: string): string {
  const ordered = Object.keys(params).sort();
  const toSign = ordered.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

type Creds = { apiKey: string; secretKey: string; environment: "dev" | "prod" };

async function callGet(creds: Creds, path: string, params: Record<string, string>) {
  const full: Record<string, string> = { apiKey: creds.apiKey, ...params };
  full.s = sign(full, creds.secretKey);
  try {
    const res = await fetch(
      `${baseUrl(creds.environment)}${path}?${new URLSearchParams(full).toString()}`,
    );
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  } catch {
    return { ok: false, json: {} as any };
  }
}

async function callPost(creds: Creds, path: string, params: Record<string, string>) {
  const full: Record<string, string> = { apiKey: creds.apiKey, ...params };
  full.s = sign(full, creds.secretKey);
  try {
    const res = await fetch(`${baseUrl(creds.environment)}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(full).toString(),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  } catch {
    return { ok: false, json: {} as any };
  }
}

/** Crea (o reutiliza si ya existe) el customer de Flow para un negocio. */
export async function createFlowCustomer(
  creds: Creds,
  params: { businessId: string; name: string; email: string },
) {
  const { ok, json } = await callPost(creds, "/customer/create", {
    name: params.name.slice(0, 100),
    email: params.email,
    externalId: params.businessId,
  });
  if (!ok || !json?.customerId) {
    return {
      ok: false as const,
      customerId: null,
      errorMessage: json?.message ?? "Error creando cliente en Flow",
    };
  }
  return { ok: true as const, customerId: json.customerId as string, errorMessage: null };
}

/** Envía al dueño del negocio a registrar su tarjeta para cargo automático. */
export async function sendCardRegistration(
  creds: Creds,
  params: { customerId: string; returnUrl: string },
) {
  const { ok, json } = await callPost(creds, "/customer/register", {
    customerId: params.customerId,
    url_return: params.returnUrl,
  });
  if (!ok || !json?.url || !json?.token) {
    return {
      ok: false as const,
      registerUrl: null,
      errorMessage: json?.message ?? "Error iniciando registro de tarjeta",
    };
  }
  return {
    ok: true as const,
    registerUrl: `${json.url}?token=${json.token}` as string,
    errorMessage: null,
  };
}

/** Verifica server-to-server si el registro de tarjeta fue exitoso -- igual
 * que con los pagos, nunca se confía solo en el retorno del navegador. */
export async function getCardRegisterStatus(creds: Creds, token: string) {
  const { ok, json } = await callGet(creds, "/customer/getRegisterStatus", { token });
  if (!ok) return { ok: false as const, active: false, customerId: null };
  // status "1" = tarjeta registrada y activa.
  return {
    ok: true as const,
    active: String(json?.status) === "1",
    customerId: json?.customerId ?? null,
  };
}

/** Cobro mensual server-to-server sobre la tarjeta ya registrada. A
 * diferencia de payment/create, este servicio de Flow es SÍNCRONO: la
 * respuesta ya trae el resultado final, no requiere esperar un webhook. */
export async function chargeSubscription(
  creds: Creds,
  params: { customerId: string; amount: number; subject: string; commerceOrder: string },
) {
  const { ok, json } = await callPost(creds, "/customer/charge", {
    customerId: params.customerId,
    amount: String(Math.round(params.amount)),
    subject: params.subject,
    commerceOrder: params.commerceOrder,
    currency: "CLP",
  });
  if (!ok)
    return {
      ok: false as const,
      status: "rejected" as const,
      flowOrder: null,
      errorMessage: json?.message ?? "Cargo rechazado",
    };
  // Mismos códigos que payment/getStatus: 2 = pagado.
  const paid = Number(json?.status) === 2;
  return {
    ok: true as const,
    status: (paid ? "paid" : "rejected") as "paid" | "rejected",
    flowOrder: json?.flowOrder ? String(json.flowOrder) : null,
    errorMessage: paid ? null : "El cargo automático fue rechazado por el banco",
  };
}

export function getFlowSubscriptionCreds(): Creds | null {
  const apiKey = process.env.FLOW_SUBSCRIPTIONS_API_KEY;
  const secretKey = process.env.FLOW_SUBSCRIPTIONS_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  const environment = process.env.FLOW_SUBSCRIPTIONS_ENV === "prod" ? "prod" : "dev";
  return { apiKey, secretKey, environment };
}
