import { afterEach, describe, expect, it, vi } from "vitest";
import { generate } from "./nuva-ai-gateway.mjs";
import { certifyRequiredProviders } from "./nuva-agency-gateway-check.mjs";

describe("Nüva AI gateway rate-limit handling", () => {
  const originalFetch = globalThis.fetch;
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalCloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const originalCloudflareAccount = process.env.CLOUDFLARE_ACCOUNT_ID;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalCloudflareToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = originalCloudflareToken;
    if (originalCloudflareAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = originalCloudflareAccount;
    vi.restoreAllMocks();
  });

  it("does not retry HTTP 429 and proceeds to the next configured provider", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    delete process.env.GEMINI_API_KEY;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "quota exhausted" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "86400" },
    }));
    globalThis.fetch = fetchMock;

    const result = await generate("check provider fallback", { providers: ["groq", "deterministic"] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("deterministic");
    expect(result.failures).toEqual([expect.objectContaining({ provider: "groq", status: 429, attempts: 1 })]);
  });

  it("requires both Gemini and Groq to pass before autonomous LLM work", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GROQ_API_KEY = "test-groq-key";
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "NÜVA_GATEWAY_OK" }] } }],
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "quota exhausted" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "86400" },
      }));
    globalThis.fetch = fetchMock;

    await expect(certifyRequiredProviders()).rejects.toThrow("no configured AI provider completed the request");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
