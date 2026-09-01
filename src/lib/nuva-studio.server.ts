import { generateTextWithFallback } from "@/lib/ai-gateway.server";
import { buildBusinessContext, capContext } from "@/lib/business-context.server";
import type { AiCapability } from "@/lib/ai-gateway/types";

const CAPABILITY_INSTRUCTIONS: Record<AiCapability, string> = {
  chat: "Responde como el agente empresarial de Nüva One. Conecta las áreas del negocio y prioriza acciones verificables.",
  research: "Actúa como analista de mercado. Separa hechos, hipótesis e inferencias y termina con oportunidades accionables.",
  marketing: "Actúa como director de marketing para una MiPyme chilena. Define objetivo, audiencia, propuesta, canal, campaña y KPIs. Usa resultados previos del flujo.",
  copywriting: "Actúa como copywriter senior. Convierte la estrategia y audiencia recibidas en mensajes concretos, hooks, CTA y variantes listas para usar.",
  image: "Actúa como director creativo. Convierte la estrategia, audiencia y copy recibidos en una pieza visual profesional y coherente con la marca.",
  image_edit: "Define instrucciones de edición visual precisas sin alterar atributos importantes del producto.",
  video: "Actúa como director audiovisual. Convierte campaña, copy e imagen recibidos en un concepto con hook, escenas, guion, texto en pantalla, CTA y voz.",
  voice: "Actúa como director de voz. Convierte el guion recibido en una locución natural, breve y adecuada para el público objetivo.",
  brand: "Construye o mejora un sistema Brand DNA coherente: personalidad, tono, mensajes, paleta conceptual y reglas de uso.",
  strategy: "Actúa como consultor estratégico. Prioriza por impacto, esfuerzo, riesgo y evidencia disponible y convierte hallazgos en decisiones.",
  document: "Genera un documento empresarial claro, estructurado y listo para revisión humana.",
  automation: "Diseña un flujo de automatización seguro, con disparador, condiciones, acciones, errores y trazabilidad.",
};
const CAPABILITIES: AiCapability[] = ["chat", "research", "marketing", "copywriting", "image", "image_edit", "video", "voice", "brand", "strategy", "document", "automation"];
const PLANNER_INSTRUCTION = `Devuelve exclusivamente JSON válido con goal, rationale y steps. Cada step debe tener capability (una de ${CAPABILITIES.join(", ")}), instruction y dependsOn (índices originales de pasos). Prefiere 3-6 pasos cuando el objetivo sea complejo. Diseña un workflow conectado, no una lista de tareas independientes. Para objetivos de marketing, prioriza investigación/estrategia antes de marketing/copy y creatividad. Usa image después de copy cuando se necesite una pieza visual; usa video después de imagen/copy; usa voice después del guion de video. Cada paso debe depender de los resultados que realmente necesita. No uses una capacidad solo para rellenar pasos.`;
function cleanText(value: string) { return value.replaceAll("\0", "").trim(); }

async function generateStructuredPlan(system: string, prompt: string) {
  const { result } = await generateTextWithFallback(async (model) => { const { generateText } = await import("ai"); return generateText({ model, system, prompt, temperature: 0.2 }); });
  const rawText = "text" in result && typeof result.text === "string" ? result.text : String(("text" in result ? result.text : "") ?? "");
  const raw = rawText.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) throw new Error("El agente no pudo construir un plan válido.");
  const parsed = JSON.parse(raw) as { goal?: unknown; rationale?: unknown; steps?: unknown };
  if (typeof parsed.goal !== "string" || typeof parsed.rationale !== "string" || !Array.isArray(parsed.steps)) throw new Error("El agente devolvió un plan con estructura inválida.");
  const steps = parsed.steps.map((step) => {
    const item = step as { capability?: unknown; instruction?: unknown; dependsOn?: unknown };
    if (!CAPABILITIES.includes(item.capability as AiCapability) || typeof item.instruction !== "string" || !Array.isArray(item.dependsOn)) throw new Error("El agente devolvió un paso inválido.");
    return { capability: item.capability as AiCapability, instruction: cleanText(item.instruction), dependsOn: item.dependsOn.filter((value): value is number => Number.isInteger(value) && value >= 0) };
  });
  return { goal: cleanText(parsed.goal), rationale: cleanText(parsed.rationale), steps };
}

export async function runNuvaStudioTask(args: { businessId: string; capability: AiCapability; prompt: string; supabase: Parameters<typeof buildBusinessContext>[0] }) {
  const businessContext = await buildBusinessContext(args.supabase, args.businessId);
  const contextText = businessContext ? capContext(businessContext) : "No hay contexto empresarial disponible.";
  const system = ["Eres Nüva Studio, el director de marketing y motor de creación de Nüva One.", CAPABILITY_INSTRUCTIONS[args.capability], "Usa el contexto empresarial disponible y los resultados previos entregados por el orquestador. Nunca inventes datos.", "Entrega una respuesta profesional y directamente utilizable. Usa títulos, listas y tablas Markdown cuando mejoren la claridad.", "Si faltan datos críticos, identifica exactamente cuál falta, por qué importa y propone una acción concreta; no devuelvas una lista genérica de tareas.", `CONTEXTO EMPRESARIAL:\n${contextText}`].join("\n\n");
  const { result, metadata } = await generateTextWithFallback(async (model) => { const { generateText } = await import("ai"); return generateText({ model, system, prompt: cleanText(args.prompt), temperature: 0.4 }); });
  const text = "text" in result && typeof result.text === "string" ? result.text : String(("text" in result ? result.text : "") ?? "");
  return { text, metadata: { provider: metadata.provider, model: metadata.model, inputTokens: metadata.inputTokens, outputTokens: metadata.outputTokens, totalTokens: metadata.totalTokens, estimatedCostUsd: metadata.estimatedCostUsd, fallbackUsed: metadata.fallbackUsed, attempts: metadata.attempts } };
}

export async function planNuvaStudioTask(args: { businessId: string; prompt: string; supabase: Parameters<typeof buildBusinessContext>[0] }) {
  const businessContext = await buildBusinessContext(args.supabase, args.businessId);
  const contextText = businessContext ? capContext(businessContext) : "No hay contexto empresarial disponible.";
  const system = ["Eres el Marketing Director y planificador autónomo de Nüva One.", "Convierte objetivos empresariales complejos en un workflow corto, conectado y ejecutable usando las capacidades de Nüva Studio.", "Piensa como un director de marketing senior: primero entiende el negocio y el objetivo, después decide qué análisis y estrategia hacen falta y recién entonces activa creación y multimedia.", "Usa el contexto empresarial y los resultados de pasos anteriores. No inventes datos.", PLANNER_INSTRUCTION, `CONTEXTO EMPRESARIAL:\n${contextText}`].join("\n\n");
  return generateStructuredPlan(system, cleanText(args.prompt));
}

export async function runNuvaStudioPlan(args: { businessId: string; prompt: string; supabase: Parameters<typeof buildBusinessContext>[0]; maxSteps?: number }) {
  const plan = await planNuvaStudioTask(args);
  const steps = plan.steps.slice(0, Math.min(args.maxSteps ?? 6, 6));
  const outputs: Array<{ step: number; capability: AiCapability; instruction: string; result: string }> = [];
  const completedByOriginalIndex = new Map<number, string>();
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const dependencies = step.dependsOn.map((dependency) => completedByOriginalIndex.get(dependency)).filter(Boolean).join("\n\n");
    const enrichedPrompt = [`Objetivo general: ${plan.goal}`, `Instrucción del paso ${index + 1}: ${step.instruction}`, dependencies ? `Resultados disponibles de pasos anteriores:\n${dependencies}` : "", "Entrega solamente el resultado necesario para avanzar al siguiente paso y deja explícitas las decisiones que el siguiente paso debe reutilizar."].filter(Boolean).join("\n\n");
    const result = await runNuvaStudioTask({ businessId: args.businessId, capability: step.capability, prompt: enrichedPrompt, supabase: args.supabase });
    outputs.push({ step: index, capability: step.capability, instruction: step.instruction, result: result.text });
    completedByOriginalIndex.set(index, result.text);
  }
  return { plan: { ...plan, steps }, outputs };
}
