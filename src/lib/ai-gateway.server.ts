import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

// Groq exposes an OpenAI-compatible endpoint, so this reuses the exact same
// adapter as Lovable above -- no new SDK dependency needed.
export function createGroqProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// Single entry point for every call site (web chat, WhatsApp webhook, quote
// follow-ups, etc). Switching AI provider later (e.g. Groq free tier caps
// out under load) means changing env vars only -- never touching call sites.
export function getChatModel() {
  const provider = (process.env.AI_PROVIDER ?? "groq").toLowerCase();

  if (provider === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY no configurado");

    // Groq retired llama-3.1-8b-instant on 2026-08-16. Keep the runtime
    // resilient even if an old GROQ_MODEL value is still configured in Vercel.
    const configuredModel = process.env.GROQ_MODEL;
    const model =
      configuredModel && configuredModel !== "llama-3.1-8b-instant"
        ? configuredModel
        : "openai/gpt-oss-20b";

    return createGroqProvider(key)(model);
  }

  if (provider === "lovable") {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY no configurado");
    return createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
  }

  throw new Error(`Proveedor de IA desconocido: "${provider}"`);
}
