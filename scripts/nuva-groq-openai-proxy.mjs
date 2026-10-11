import { createServer } from "node:http";
import { Readable } from "node:stream";

const PORT = Number(process.env.NUVA_GROQ_PROXY_PORT || 4318);
const AUDIENCE = "https://vnzyecnbdqbfuxawzrda.supabase.co";
const BROKER_URL = "https://vnzyecnbdqbfuxawzrda.supabase.co/functions/v1/nuva-agency-ai-broker/v1/chat/completions";
const MAX_BODY_BYTES = 1_000_000;

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_too_large");
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

async function getFreshOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) throw new Error("github_oidc_unavailable");

  const url = new URL(requestUrl);
  url.searchParams.set("audience", AUDIENCE);
  const response = await fetch(url, {
    headers: { authorization: "Bearer " + requestToken },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("github_oidc_http_" + response.status);
  const payload = await response.json();
  if (typeof payload?.value !== "string" || !payload.value) throw new Error("github_oidc_token_missing");
  return payload.value;
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  if (req.method === "GET" && pathname === "/health") {
    return sendJson(res, 200, {
      ok: Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN),
    });
  }
  if (req.method !== "POST" || pathname !== "/v1/chat/completions") {
    return sendJson(res, 404, { error: "not_found" });
  }

  try {
    const body = await readBody(req);
    const oidcToken = await getFreshOidcToken();
    const upstream = await fetch(BROKER_URL, {
      method: "POST",
      headers: {
        authorization: "Bearer " + oidcToken,
        "content-type": req.headers["content-type"] || "application/json",
        accept: req.headers.accept || "application/json",
      },
      body,
      signal: AbortSignal.timeout(120000),
    });

    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    const kind = error instanceof Error ? error.message : "proxy_error";
    const safeKind = /^[a-zA-Z0-9_-]{1,80}$/.test(kind) ? kind : "proxy_error";
    sendJson(res, 502, { error: "nuva_groq_proxy_failed", reason: safeKind });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write("Nüva local OIDC proxy ready on loopback.\n");
});
