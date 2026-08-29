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

function cleanText(value: string) {
  return value.replace(/\u0000/g, "").trim();
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
    return generateText({
      model,
      system,
      prompt: cleanText(args.prompt),
      temperature: 0.4,
    });
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
