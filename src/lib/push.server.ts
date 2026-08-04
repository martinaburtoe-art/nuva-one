import { createSign } from "node:crypto";

/**
 * Envío de push notifications via FCM HTTP v1 API, usando una service account
 * de Firebase. No usamos el SDK firebase-admin para no sumar una dependencia
 * pesada — el intercambio OAuth2 + el POST a FCM son pocas líneas con `fetch`
 * y el módulo `crypto` nativo de Node.
 *
 * Variables de entorno requeridas (configurar en Vercel):
 * - FIREBASE_PROJECT_ID: el project ID de Firebase (ej. "nuva-one-12345")
 * - FIREBASE_SERVICE_ACCOUNT_JSON: el contenido completo del JSON de la
 *   service account descargado desde Firebase Console > Configuración del
 *   proyecto > Cuentas de servicio > Generar nueva clave privada.
 *   Se guarda como un solo string (todo el JSON) en la variable de entorno.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(input: Buffer | string) {
  return (typeof input === "string" ? Buffer.from(input) : input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(raw);
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(claimSet.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    console.error("Error obteniendo access token de FCM", await res.text());
    return null;
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Envía una notificación a una lista de tokens FCM. Tokens inválidos o
 * expirados se reportan en el resultado para que el llamador pueda limpiarlos
 * de `device_tokens`.
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; invalidTokens: string[] }> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const accessToken = await getAccessToken();

  if (!projectId || !accessToken) {
    // Firebase no está configurado todavía — no es un error fatal, solo no hay push.
    return { sent: 0, invalidTokens: [] };
  }

  let sent = 0;
  const invalidTokens: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: payload.title, body: payload.body },
                data: payload.data ?? {},
                android: { priority: "high" },
              },
            }),
          },
        );
        if (res.ok) {
          sent += 1;
        } else {
          const errText = await res.text();
          // UNREGISTERED / NOT_FOUND = el token ya no es válido (app desinstalada, etc.)
          if (errText.includes("UNREGISTERED") || errText.includes("NOT_FOUND")) {
            invalidTokens.push(token);
          } else {
            console.error("Error FCM para un token", errText);
          }
        }
      } catch (err) {
        console.error("Error de red enviando push", err);
      }
    }),
  );

  return { sent, invalidTokens };
}
