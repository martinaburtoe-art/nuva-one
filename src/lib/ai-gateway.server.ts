import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const RETIRED_GROQ_MODELS = new Set(["llama-3.1-8b-instant"]);
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const DEFAULT_LOVABLE_MODEL = "google/gemini-3-flash-preview";
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

type ProviderName = "groq" | "lovable" | "openai";

type ProviderCandidate = {
  provider: ProviderName;
  model: string;
  languageModel: ReturnType<ReturnType<typeof createOpenAICompatible>>;
};

export type AiGenerationMetadata = {
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  fallbackUsed: boolean;
  attempts: number;
};

const providerFailures = new Map<ProviderName, { failures: number; openUntil: number }>();
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 30_000;

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

export function createOpenAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

function resolveGroqModel(configuredModel?: string) {
  const normalized = configuredModel?.trim();
  if (!normalized || RETIRED_GROQ_MODELS.has(normalized)) return DEFAULT_GROQ_MODEL;
  return normalized;
}

function configuredProviderOrder(): ProviderName[] {
  const primary = (process.env.AI_PROVIDER ?? "groq").toLowerCase() as ProviderName;
  const configuredFallbacks = (process.env.AI_FALLBACK_PROVIDERS ?? "lovable,openai")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName =>
      value === "groq" || value === "lovable" || value === "openai",
    );
  return Array.from(new Set([primary, ...configuredFallbacks]));
}

function isCircuitOpen(provider: ProviderName) {
  const state = providerFailures.get(provider);
  if (!state) return false;
  if (state.openUntil <= Date.now()) {
    providerFailures.delete(provider);
    return false;
  }
  return state.failures >= CIRCUIT_FAILURE_THRESHOLD;
}

function recordProviderSuccess(provider: ProviderName) {
  providerFailures.delete(provider);
}

function recordProviderFailure(provider: ProviderName) {
  const previous = providerFailures.get(provider);
  const failures = (previous?.failures ?? 0) + 1;
  providerFailures.set(provider, {
    failures,
    openUntil: failures >= CIRCUIT_FAILURE_THRESHOLD ? Date.now() + CIRCUIT_OPEN_MS : 0,
  });
}

function buildCandidate(provider: ProviderName): ProviderCandidate | null {
  if (provider === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    const model = resolveGroqModel(process.env.GROQ_MODEL);
    return { provider, model, languageModel: createGroqProvider(key)(model) };
  }

  if (provider === "lovable") {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return null;
    const model = process.env.LOVABLE_MODEL?.trim() || DEFAULT_LOVABLE_MODEL;
    return { provider, model, languageModel: createLovableAiGatewayProvider(key)(model) };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  return { provider, model, languageModel: createOpenAiProvider(key)(model) };
}

export function getChatModelCandidates(): ProviderCandidate[] {
  return configuredProviderOrder()
    .filter((provider) => !isCircuitOpen(provider))
    .map(buildCandidate)
    .filter((candidate): candidate is ProviderCandidate => candidate !== null);
}

export function getChatModel() {
  const candidate = getChatModelCandidates()[0];
  if (!candidate) {
    throw new Error(
      "No hay un proveedor de IA disponible. Configura GROQ_API_KEY, LOVABLE_API_KEY u OPENAI_API_KEY.",
    );
  }
  return candidate.languageModel;
}

function usageNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function pricePerMillion(provider: ProviderName, direction: "input" | "output") {
  const envKey = `${provider.toUpperCase()}_${direction.toUpperCase()}_PRICE_PER_MILLION_USD`;
  const configured = Number(process.env[envKey]);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  if (provider === "groq") return direction === "input" ? 0.075 : 0.3;
  return 0;
}

export function estimateAiCostUsd(
  provider: ProviderName,
  inputTokens: number,
  outputTokens: number,
) {
  return (
    (inputTokens / 1_000_000) * pricePerMillion(provider, "input") +
    (outputTokens / 1_000_000) * pricePerMillion(provider, "output")
  );
}

export function isRetryableAiError(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === "number") return status === 408 || status === 409 || status === 429 || status >= 500;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /timeout|timed out|network|fetch failed|econn|socket|temporar|unavailable|overloaded/.test(message);
}

export async function generateTextWithFallback<T extends Record<string, unknown>>(
  generate: (model: ProviderCandidate["languageModel"]) => Promise<T & { usage?: unknown }>,
) {
  const candidates = getChatModelCandidates();
  if (candidates.length === 0) throw new Error("No hay proveedores de IA configurados o disponibles.");

  let lastError: unknown;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      const result = await generate(candidate.languageModel);
      recordProviderSuccess(candidate.provider);
      const usage = (result.usage ?? {}) as Record<string, unknown>;
      const inputTokens = usageNumber(usage.inputTokens);
      const outputTokens = usageNumber(usage.outputTokens);
      const totalTokens = usageNumber(usage.totalTokens) || inputTokens + outputTokens;
      const metadata: AiGenerationMetadata = {
        provider: candidate.provider,
        model: candidate.model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: estimateAiCostUsd(candidate.provider, inputTokens, outputTokens),
        fallbackUsed: index > 0,
        attempts: index + 1,
      };
      return { result, metadata };
    } catch (error) {
      lastError = error;
      if (!isRetryableAiError(error) || index === candidates.length - 1) break;
      recordProviderFailure(candidate.provider);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Todos los proveedores de IA fallaron.");
}
