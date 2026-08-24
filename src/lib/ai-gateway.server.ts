import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const RETIRED_GROQ_MODELS = new Set(["llama-3.1-8b-instant"]);
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export function createGroqProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

function resolveGroqModel(configuredModel?: string) {
  const normalized = configuredModel?.trim();
  if (!normalized || RETIRED_GROQ_MODELS.has(normalized)) {
    return DEFAULT_GROQ_MODEL;
  }
  return normalized;
}

export function getChatModel() {
  const provider = (process.env.AI_PROVIDER ?? "groq").toLowerCase();

  if (provider === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY no configurado");
    return createGroqProvider(key)(resolveGroqModel(process.env.GROQ_MODEL));
  }

  if (provider === "lovable") {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY no configurado");
    return createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
  }

  throw new Error(`Proveedor de IA desconocido: "${provider}"`);
}
