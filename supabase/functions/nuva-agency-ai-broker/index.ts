import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as jose from "jsr:@panva/jose@6";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "https://vnzyecnbdqbfuxawzrda.supabase.co";
const REPOSITORY = "martinaburtoe-art/nuva-one";
const JWKS = jose.createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

function deny(message: string, status = 401) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status, headers: { "content-type": "application/json" },
  });
}

async function verifyGitHubToken(token: string) {
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: ISSUER, audience: AUDIENCE,
  });
  if (payload.repository !== REPOSITORY) throw new Error("github_identity_not_allowed");
  const event = payload.event_name;
  const workflow = payload.workflow;
  const isMain = payload.ref === "refs/heads/main" && event !== "pull_request";
  const isCertifiedPull = event === "pull_request" &&
    payload.base_ref === "main" &&
    workflow === "Nüva Agency — AI Gateway Live Certification";
  if (!isMain && !isCertifiedPull) throw new Error("github_execution_context_not_allowed");
  return payload;
}

async function resolveCloudflareAccount(token: string, configured: string | null): Promise<{ accountId: string; model: string }> {
  const candidates: string[] = [];
  if (configured && /^[a-f0-9]{32}$/i.test(configured)) candidates.push(configured);

  // A valid-looking but stale account ID must not block discovery of other accessible accounts.
  let discoveryStatus: number | null = null;
  let discoveryFailure: string | null = null;
  let probeFailure: string | null = null;
  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50", {
      headers: { authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    discoveryStatus = response.status;
    if (response.ok) {
      const json = await response.json().catch(() => ({}));
      const accounts = Array.isArray(json?.result) ? json.result : [];
      for (const account of accounts) {
        if (typeof account?.id === "string" && /^[a-f0-9]{32}$/i.test(account.id) && !candidates.includes(account.id)) {
          candidates.push(account.id);
        }
      }
    }
  } catch (error) {
    // Keep only the exception class; never log tokens, URLs containing credentials, or response bodies.
    discoveryFailure = error instanceof Error ? error.name : "unknown";
  }

  const models = [
    "@cf/meta/llama-3.1-8b-instruct-fp8",
    "@cf/meta/llama-3.1-8b-instruct-fast",
  ];
  let lastProbeStatus: number | null = null;
  for (const accountId of candidates) {
    for (const model of models) {
      try {
        const probe = await fetch(
          "https://api.cloudflare.com/client/v4/accounts/" + accountId + "/ai/run/" + model,
          {
            method: "POST",
            headers: { authorization: "Bearer " + token, "content-type": "application/json" },
            body: JSON.stringify({ prompt: "Return exactly: NÜVA_HEALTH_OK", max_tokens: 16 }),
            signal: AbortSignal.timeout(15000),
          }
        );
        lastProbeStatus = probe.status;
        if (probe.ok) return { accountId, model };
      } catch (error) {
        // Preserve a coarse error class for diagnosis without exposing sensitive details.
        probeFailure = error instanceof Error ? error.name : "unknown";
      }
    }
  }

  if (candidates.length === 0 && discoveryStatus !== null && discoveryStatus !== 200) {
    throw new Error("cloudflare_account_discovery_http_" + discoveryStatus);
  }
  if (lastProbeStatus !== null) {
    throw new Error("cloudflare_account_ai_not_found_http_" + lastProbeStatus);
  }
  if (candidates.length === 0 && discoveryFailure) {
    throw new Error("cloudflare_account_discovery_network_" + discoveryFailure);
  }
  if (candidates.length === 0 && discoveryStatus === 200) {
    throw new Error("cloudflare_account_discovery_no_accessible_accounts");
  }
  throw new Error("cloudflare_account_ai_probe_network_" + (probeFailure ?? "unknown"));
}
async function providerConfig(provider: string, cloudflareAccountId: string | null) {
  if (provider === "gemini") {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return null;
    return { endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" + encodeURIComponent(key),
      body: (prompt: string) => ({ contents: [{ role: "user", parts: [{ text: prompt }] }] }) };
  }
  if (provider === "groq") {
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) return null;
    return { endpoint: "https://api.groq.com/openai/v1/chat/completions", headers: { authorization: "Bearer " + key },
      body: (prompt: string) => ({ model: Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b", messages: [{ role: "user", content: prompt }], temperature: 0.2 }) };
  }
  if (provider === "cloudflare") {
    const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const configuredAccount = cloudflareAccountId || Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    if (!token) return null;
    const account = await resolveCloudflareAccount(token, configuredAccount);
    return { endpoint: "https://api.cloudflare.com/client/v4/accounts/" + account.accountId + "/ai/run/" + account.model,
      headers: { authorization: "Bearer " + token },
      body: (prompt: string) => ({ prompt, max_tokens: 2048 }) };
  }
  return null;
}

async function callProvider(provider: string, prompt: string, cloudflareAccountId: string | null) {
  const cfg = await providerConfig(provider, cloudflareAccountId);
  if (!cfg) throw new Error("provider_not_configured");
  let lastError = "provider_request_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(cfg.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cfg.headers || {}) },
    body: JSON.stringify(cfg.body(prompt)),
    signal: AbortSignal.timeout(30000),
  });
    const raw = await response.text();
    let json: any;
    try { json = JSON.parse(raw); } catch { json = {}; }
    if (!response.ok) {
      lastError = "provider_http_" + response.status;
      if (provider === "cloudflare" && response.status === 404) {
        lastError += "_" + raw.replace(/[^a-zA-Z0-9_ -]/g, " ").replace(/\\s+/g, " ").trim().slice(0, 180);
      }
      if ([408, 425, 429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      throw new Error(lastError);
    }
    const content = provider === "gemini"
    ? json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || ""
    : provider === "groq"
      ? json?.choices?.[0]?.message?.content || ""
      : json?.result?.response || "";
    if (!content) throw new Error("provider_empty_response");
    return content;
  }
  throw new Error(lastError);
}

async function proxyGroqChatCompletions(req: Request, identity: Record<string, unknown>) {
  const allowedWorkflows = new Set([
    "Nüva One — Durable Autonomous Agent Worker",
    "Nüva One — Autonomous Agency Workers",
  ]);
  if (
    identity.ref !== "refs/heads/main" ||
    identity.event_name === "pull_request" ||
    !allowedWorkflows.has(String(identity.workflow || ""))
  ) {
    return deny("groq_proxy_workflow_not_allowed", 403);
  }

  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return deny("groq_provider_not_configured", 503);

  const raw = await req.text();
  if (raw.length > 1_000_000) return deny("request_too_large", 413);

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    return deny("invalid_json", 400);
  }
  if (!Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > 250) {
    return deny("invalid_messages", 400);
  }
  if (Array.isArray(input.tools) && input.tools.length > 128) {
    return deny("too_many_tools", 400);
  }

  const model = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b";
  const upstreamBody = { ...input, model };
  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: "Bearer " + key,
      "content-type": "application/json",
      accept: req.headers.get("accept") || "application/json",
    },
    body: JSON.stringify(upstreamBody),
    signal: AbortSignal.timeout(120000),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return deny("method_not_allowed", 405);
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return deny("missing_github_oidc");
  let identity: Record<string, unknown>;
  try { identity = await verifyGitHubToken(token) as Record<string, unknown>; } catch { return deny("invalid_github_oidc"); }

  const pathname = new URL(req.url).pathname;
  if (pathname.endsWith("/v1/chat/completions")) {
    try {
      return await proxyGroqChatCompletions(req, identity);
    } catch (error) {
      return deny(error instanceof Error && /^groq_/.test(error.message) ? error.message : "groq_proxy_upstream_failed", 502);
    }
  }

  let input: any;
  try { input = await req.json(); } catch { return deny("invalid_json", 400); }
  const action = input?.action || "health";
  if (!["health", "generate"].includes(action)) return deny("unsupported_action", 400);
  const providers = Array.isArray(input?.providers) ? input.providers : ["gemini", "groq", "cloudflare"];
  const prompt = typeof input?.prompt === "string" ? input.prompt.slice(0, 12000) : "Return exactly: NÜVA_HEALTH_OK";
  // Only a trusted main-branch workflow may supply the non-secret account ID. PR runs must use server config/discovery.
  const mainWorkflow = identity.ref === "refs/heads/main" && identity.event_name !== "pull_request";
  const requestedAccountId = mainWorkflow && typeof input?.cloudflareAccountId === "string" &&
    /^[a-f0-9]{32}$/i.test(input.cloudflareAccountId) ? input.cloudflareAccountId : null;
  const results: any[] = [];
  for (const provider of providers.slice(0, 3)) {
    try {
      const content = await callProvider(provider, prompt, requestedAccountId);
      results.push({ provider, pass: action === "health" ? content.trim() === "NÜVA_HEALTH_OK" : true, content: action === "health" ? undefined : content });
    } catch (error) {
      results.push({ provider, pass: false, error: error instanceof Error ? error.message : "request_failed" });
    }
  }
  return Response.json({ ok: results.every((r) => r.pass), results });
});
