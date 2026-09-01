import type { AiCapability, AiToolDefinition } from "./types";

/** Provider-agnostic capabilities. Secrets remain in deployment environment variables. */
export const AI_TOOLS: AiToolDefinition[] = [
  {
    id: "agent.chat",
    label: "Nüva Agent",
    capability: "chat",
    provider: "google",
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview",
    enabled: true,
    costUnits: 1,
    plans: ["starter", "pro"],
    dailyLimit: 20,
    monthlyLimit: 300,
    description: "Asistente empresarial con contexto y memoria.",
  },
];

export function getTool(id: string) {
  return AI_TOOLS.find((tool) => tool.id === id);
}

export function getToolsForCapability(capability: AiCapability) {
  return AI_TOOLS.filter((tool) => tool.capability === capability && tool.enabled);
}
