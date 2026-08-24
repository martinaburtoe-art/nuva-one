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

  it("keeps a valid configured Groq model", async () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");

    const { getChatModel } = await import("./ai-gateway.server");
    getChatModel();

    expect(providerModel).toHaveBeenCalledWith("openai/gpt-oss-20b");
  });
});
