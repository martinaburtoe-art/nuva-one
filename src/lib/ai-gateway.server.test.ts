import { describe, expect, it, vi, afterEach } from "vitest";

const providerModel = vi.fn((model: string) => ({ model }));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => providerModel,
}));

describe("AI gateway model selection", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    providerModel.mockClear();
  });

  it("falls back when Groq is configured with the retired llama model", async () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubEnv("GROQ_MODEL", "llama-3.1-8b-instant");

    const { getChatModel } = await import("./ai-gateway.server");
    getChatModel();

    expect(providerModel).toHaveBeenCalledWith("openai/gpt-oss-20b");
  });


  it("continues failover after a provider quota error and an invalid fallback credential", async () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("AI_FALLBACK_PROVIDERS", "lovable,openai");
    vi.stubEnv("GROQ_API_KEY", "groq-test");
    vi.stubEnv("GROQ_MODEL", "test-groq");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-test");
    vi.stubEnv("LOVABLE_MODEL", "test-lovable");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("OPENAI_MODEL", "test-openai");

    const { generateTextWithFallback } = await import("./ai-gateway.server");
    const attempted: string[] = [];
    const result = await generateTextWithFallback(async (model) => {
      const name = (model as unknown as { model: string }).model;
      attempted.push(name);
      if (name === "test-groq") throw Object.assign(new Error("quota exceeded"), { statusCode: 429 });
      if (name === "test-lovable") throw Object.assign(new Error("invalid credential"), { statusCode: 401 });
      return { ok: true, usage: { inputTokens: 10, outputTokens: 5 } };
    });

    expect(attempted).toEqual(["test-groq", "test-lovable", "test-openai"]);
    expect(result.metadata).toMatchObject({ provider: "openai", fallbackUsed: true, attempts: 3 });
  });

  it("does not fail over for a non-retryable request error", async () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("AI_FALLBACK_PROVIDERS", "openai");
    vi.stubEnv("GROQ_API_KEY", "groq-test");
    vi.stubEnv("GROQ_MODEL", "test-groq");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("OPENAI_MODEL", "test-openai");

    const { generateTextWithFallback } = await import("./ai-gateway.server");
    const attempted: string[] = [];
    await expect(generateTextWithFallback(async (model) => {
      attempted.push((model as unknown as { model: string }).model);
      throw Object.assign(new Error("invalid request"), { statusCode: 400 });
    })).rejects.toThrow("invalid request");
    expect(attempted).toEqual(["test-groq"]);
  });

  it("keeps a valid configured Groq model", async () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");

    const { getChatModel } = await import("./ai-gateway.server");
    getChatModel();

    expect(providerModel).toHaveBeenCalledWith("openai/gpt-oss-20b");
  });
});
