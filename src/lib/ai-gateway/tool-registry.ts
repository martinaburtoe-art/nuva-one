import type { AiCapability, AiToolDefinition } from "./types";

/**
 * Provider-agnostic capabilities. Secrets are deliberately not stored here;
 * providers are configured through deployment environment variables.
 */
export const AI_TOOLS: AiToolDefinition[] = [
  {
    id: "agent.chat",
    label: "Nüva Agent",
    capability: "chat",
    provider: "google",
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview",
    enabled: true,
    costUnits: 1,
    plans: ["free", "pro", "business", "enterprise"],
    dailyLimit: 20,
    monthlyLimit: 300,
    description: "Asistente empresarial con contexto y memoria.",
  },
  {
    id: "studio.research",
    label: "Investigación inteligente",
    capability: "research",
    provider: "google",
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview",
    enabled: true,
    costUnits: 3,
    plans: ["free", "pro", "business", "enterprise"],
    dailyLimit: 5,
    monthlyLimit: 30,
    description: "Investigación y síntesis para decisiones empresariales.",
  },
  {
    id: "studio.marketing",
    label: "Nüva Marketing",
    capability: "marketing",
    provider: "google",
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview",
    enabled: true,
    costUnits: 2,
    plans: ["free", "pro", "business", "enterprise"],
    dailyLimit: 3,
    monthlyLimit: 20,
    description: "Campañas, calendarios y estrategias de contenido.",
  },
  {
    id: "studio.copywriting",
    label: "Generador de contenido",
    capability: "copywriting",
    provider: "google",
    enabled: true,
    costUnits: 1,
    plans: ["free", "pro", "business", "enterprise"],
    dailyLimit: 10,
    monthlyLimit: 100,
    description: "Copies, slogans, guiones y contenido para redes.",
  },
  {
    id: "studio.image",
    label: "Nüva Creative",
    capability: "image",
    provider: "google",
    model: process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image",
    enabled: true,
    costUnits: 5,
    plans: ["free", "pro", "business", "enterprise"],
    dailyLimit: 2,
    monthlyLimit: 10,
    description: "Piezas visuales y fotografía de producto.",
  },
  {
    id: "studio.voice",
    label: "Nüva Voice",
    capability: "voice",
    provider: "fish_audio",
    enabled: true,
    costUnits: 2,
    plans: ["free", "pro", "business", "enterprise"],
    dailyLimit: 5,
    monthlyLimit: 30,
    description: "Locuciones para contenido y campañas.",
  },
  {
    id: "studio.video",
    label: "Nüva Video",
    capability: "video",
    provider: "n8n",
    enabled: true,
    costUnits: 20,
    plans: ["pro", "business", "enterprise"],
    dailyLimit: 2,
    monthlyLimit: 15,
    description: "Orquestación de guion, voz, visuales y video.",
  },
  {
    id: "studio.brand",
    label: "Brand DNA",
    capability: "brand",
    provider: "google",
    enabled: true,
    costUnits: 3,
    plans: ["free", "pro", "business", "enterprise"],
    monthlyLimit: 10,
    description: "Sistema de identidad y consistencia de marca.",
  },
  {
    id: "studio.automation",
    label: "Nüva Automate",
    capability: "automation",
    provider: "n8n",
    enabled: true,
    costUnits: 5,
    plans: ["pro", "business", "enterprise"],
    monthlyLimit: 50,
    description: "Flujos de trabajo y acciones automáticas.",
  },
];

export function getTool(id: string) {
  return AI_TOOLS.find((tool) => tool.id === id);
}

export function getToolsForCapability(capability: AiCapability) {
  return AI_TOOLS.filter((tool) => tool.capability === capability && tool.enabled);
}
