// Live certification trigger: deterministic, credential-safe provider probes.
/**
 * Nüva AI Gateway
 *
 * Multi-provider, quota-aware and failover-safe gateway for autonomous workers.
 * Providers are optional. The gateway never logs credentials.
 */

const CLOUDFLARE_DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const CLOUDFLARE_DEPRECATED_MODELS = new Set(["@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.1-8b-instruct-awq"]);
const configuredCloudflareModel = process.env.CLOUDFLARE_AI_MODEL?.trim();
const CLOUDFLARE_MODEL = configuredCloudflareModel && !CLOUDFLARE_DEPRECATED_MODELS.has(configuredCloudflareModel)
  ? configuredCloudflareModel
  : CLOUDFLARE_DEFAULT_MODEL;

const DEFAULT_MODELS = Object.freeze({
  gemini: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  groq: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  cloudflare: CLOUDFLARE_MODEL,
});

const PROVIDER_ORDER = ["gemini", "groq", "cloudflare"];
const TRANSIENT_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const MAX_PROMPT_CHARS = 12000;

function configured(provider) {
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  if (provider === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (provider === "cloudflare") {
    return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
  }
  return false;
}

function endpoint(provider) {
  if (provider === "gemini") {
    return `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODELS.gemini}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  }
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  return `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${encodeURIComponent(DEFAULT_MODELS.cloudflare)}`;
}

function headers(provider) {
  if (provider === "gemini") return { "content-type": "application/json" };
  return {
    "content-type": "application/json",
    authorization: `Bearer ${provider === "groq" ? process.env.GROQ_API_KEY : process.env.CLOUDFLARE_API_TOKEN}`,
  };
}

function body(provider, prompt) {
  if (provider === "gemini") {
    return {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    };
  }
  if (provider === "groq") {
    return {
      model: DEFAULT_MODELS.groq,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    };
  }
  return { prompt, max_tokens: 4096 };
}

function extract(provider, json) {
  if (provider === "gemini") return json?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (provider === "groq") return json?.choices?.[0]?.message?.content || "";
  return json?.result?.response || "";
}

async function request(provider, prompt, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint(provider), {
      method: "POST",
      headers: headers(provider),
      body: JSON.stringify(body(provider, prompt)),
      signal: controller.signal,
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!response.ok) {
      const error = new Error(`${provider} HTTP ${response.status}`);
      error.status = response.status;
      error.retryAfterMs = Math.min(5000, Math.max(250, Number(response.headers.get("retry-after") || 0) * 1000));
      throw error;
    }
    const content = extract(provider, json);
    if (!content) throw new Error(`${provider} returned no text`);
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export function providerStatus() {
  return PROVIDER_ORDER.map((provider) => ({
    provider,
    configured: configured(provider),
    model: DEFAULT_MODELS[provider],
  }));
}

export async function generate(prompt, options = {}) {
  if (!prompt?.trim()) throw new Error("Gateway prompt cannot be empty");
  prompt = prompt.slice(0, MAX_PROMPT_CHARS);
  const order = options.providers?.length ? options.providers : PROVIDER_ORDER;
  const timeoutMs = options.timeoutMs ?? 45000;
  const failures = [];

  for (const provider of order) {
    if (!configured(provider)) {
      failures.push({ provider, reason: "not_configured" });
      continue;
    }
    if (options.forceFailureProvider === provider) {
      failures.push({ provider, reason: "forced_failure", status: null });
      continue;
    }
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const content = await request(provider, prompt, timeoutMs);
        return { provider, model: DEFAULT_MODELS[provider], content, failures, attempts: attempt + 1 };
      } catch (error) {
        const transient = TRANSIENT_STATUS.has(error?.status);
        if (!transient || attempt === MAX_RETRIES) {
          failures.push({ provider, reason: error?.message || "request_failed", status: error?.status ?? null, attempts: attempt + 1 });
          break;
        }
        const delay = error?.retryAfterMs || 250 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const error = new Error("Nüva AI Gateway: no configured provider completed the request");
  error.failures = failures;
  throw error;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || "status";
  if (mode === "status") {
    console.log(JSON.stringify(providerStatus(), null, 2));
  } else if (mode === "test") {
    const result = await generate(process.argv.slice(3).join(" ") || "Return only: Nüva Gateway OK");
    console.log(JSON.stringify({ provider: result.provider, model: result.model, content: result.content, failures: result.failures }, null, 2));
  } else {
    console.error("Usage: node scripts/nuva-ai-gateway.mjs [status|test <prompt>]");
    process.exit(2);
  }
}
