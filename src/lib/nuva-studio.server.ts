import { generateTextWithFallback } from "@/lib/ai-gateway.server";
import { buildBusinessContext, capContext } from "@/lib/business-context.server";
import type { AiCapability } from "@/lib/ai-gateway/types";

const CAPABILITY_INSTRUCTIONS: Record<AiCapability, string> = {
  chat: "Responde como el agente empresarial de Nüva One. Conecta las áreas del negocio y prioriza acciones verificables.",
  research: "Investiga y sintetiza información útil para una decisión empresarial. Separa hechos, inferencias y recomendaciones.",
  marketing: "Actúa como director de marketing para una MiPyme chilena. Diseña campañas accionables, medibles y coherentes con la marca.",
  copywriting: "Escribe contenido natural y comercial en español de Chile. Evita clichés, exageraciones y afirmaciones no verificadas.",
  image: "Describe con precisión una pieza visual lista para un generador de imágenes, respetando producto, marca, público y objetivo.",
  image_edit: "Define instrucciones de edición visual precisas sin alterar atributos importantes del producto.",
  video: "Construye un concepto audiovisual con hook, guion, escenas, texto en pantalla, CTA y voz.",
  voice: "Prepara un guion de locución natural, breve y adecuado para contenido comercial.",
  brand: "Construye o mejora un sistema Brand DNA coherente: personalidad, tono, mensajes, paleta conceptual y reglas de uso.",
  strategy: "Actúa como consultor estratégico. Prioriza por impacto, esfuerzo, riesgo y evidencia disponible.",
  document: "Genera un documento empresarial claro, estructurado y listo para revisión humana.",
  automation: "Diseña un flujo de automatización seguro, con disparador, condiciones, acciones, errores y trazabilidad.",
};

const PLANNER_SCHEMA = {
  type: "object",
  properties: {
    goal: { type: "string" },
    rationale: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          capability: { type: "string", enum: ["chat", "research", "marketing", "copywriting", "image", "image_edit", "video", "voice", "brand", "strategy", "document", "automation"] },
          instruction: { type: "string" },
          dependsOn: { type: "array", items: { type: "integer" } },
        },
        required: ["capability", "instruction", "dependsOn"],
      },
    },
  },
  required: ["goal", "rationale", "steps"],
};

function cleanText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

async function generateStructuredPlan(system: string, prompt: string) {
  const { result } = await generateTextWithFallback(async (model) => {
    const { generateText } = await import("ai");
    return generateText({
      model,
      system,
      prompt,
      temperature: 0.2,
    });
  });

  const raw = result.text.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) throw new Error("El agente no pudo construir un plan válido.");
  return JSON.parse(raw) as {
    goal: string;
    rationale: string;
    steps: Array<{ capability: AiCapability; instruction: string; dependsOn: number[] }>;
  };
}

export async function runNuvaStudioTask(args: {
  businessId: string;
  capability: AiCapability;
  prompt: string;
  supabase: Parameters<typeof buildBusinessContext>[0];
}) {
  const businessContext = await buildBusinessContext(args.supabase, args.businessId);
  const contextText = businessContext ? capContext(businessContext) : "No hay contexto empresarial disponible.";

  const system = [
    "Eres Nüva Studio, el motor de creación y crecimiento de Nüva One.",
    CAPABILITY_INSTRUCTIONS[args.capability],
    "Usa el contexto empresarial disponible, pero nunca inventes datos que no aparezcan allí.",
    "Cuando falten datos críticos, dilo y propone una forma concreta de obtenerlos.",
    "Entrega resultados directamente utilizables por una MiPyme.",
    "CONTEXTO EMPRESARIAL:\n" + contextText,
  ].join("\n\n");

  const { result, metadata } = await generateTextWithFallback(async (model) => {
    const { generateText } = await import("ai");
    return generateText({ model, system, prompt: cleanText(args.prompt), temperature: 0.4 });
  });

  return {
    text: result.text,
    metadata: {
      provider: metadata.provider,
      model: metadata.model,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      totalTokens: metadata.totalTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      fallbackUsed: metadata.fallbackUsed,
      attempts: metadata.attempts,
    },
  };
}

export async function planNuvaStudioTask(args: {
  businessId: string;
  prompt: string;
  supabase: Parameters<typeof buildBusinessContext>[0];
}) {
  const businessContext = await buildBusinessContext(args.supabase, args.businessId);
  const contextText = businessContext ? capContext(businessContext) : "No hay contexto empresarial disponible.";
  const system = [
    "Eres el planificador autónomo de Nüva One.",
    "Convierte objetivos empresariales complejos en un plan corto y ejecutable usando las capacidades de Nüva Studio.",
    "Usa el contexto empresarial y no inventes datos.",
    "Prefiere 2-6 pasos. Cada paso debe producir un entregable útil para el siguiente.",
    "Solo usa capacidades válidas del esquema.",
    "Devuelve exclusivamente JSON válido siguiendo este esquema conceptual: goal, rationale y steps(capability,instruction,dependsOn).",
    "CONTEXTO EMPRESARIAL:\n" + contextText,
  ].join("\n\n");
  return generateStructuredPlan(system, cleanText(args.prompt));
}

export async function runNuvaStudioPlan(args: {
  businessId: string;
  prompt: string;
  supabase: Parameters<typeof buildBusinessContext>[0];
  maxSteps?: number;
}) {
  const plan = await planNuvaStudioTask(args);
  const steps = plan.steps.slice(0, Math.min(args.maxSteps ?? 6, 6));
  const outputs: Array<{ step: number; capability: AiCapability; instruction: string; result: string }> = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const dependencies = step.dependsOn
      .filter((dependency) => dependency >= 0 && dependency < outputs.length)
      .map((dependency) => outputs[dependency]?.result)
      .filter(Boolean)
      .join("\n\n");
    const enrichedPrompt = [
      `Objetivo general: ${plan.goal}`,
      `Instrucción del paso ${index + 1}: ${step.instruction}`,
      dependencies ? `Resultados disponibles de pasos anteriores:\n${dependencies}` : "",
      "Entrega solamente el resultado necesario para avanzar al siguiente paso.",
    ].filter(Boolean).join("\n\n");
    const result = await runNuvaStudioTask({
      businessId: args.businessId,
      capability: step.capability,
      prompt: enrichedPrompt,
      supabase: args.supabase,
    });
    outputs.push({ step: index, capability: step.capability, instruction: step.instruction, result: result.text });
  }

  return { plan: { ...plan, steps }, outputs };
}
