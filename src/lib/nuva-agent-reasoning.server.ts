import { generateText } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai-gateway.server";
import type { NuvaAgentCouncilResult } from "./nuva-intelligence-agent-council";

const ReasoningSchema = z.object({
  rationale: z.string().min(1).max(1200),
  conflictResolution: z.string().min(1).max(800),
  missingData: z.array(z.string().max(200)).max(8),
  recommendedNextStep: z.string().min(1).max(500),
});

export type NuvaAgentReasoning = z.infer<typeof ReasoningSchema>;

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "");
  return JSON.parse(cleaned) as unknown;
}

/**
 * Optional second-pass reasoning.
 * The deterministic council remains the source of truth for priority and execution.
 * LLM output can only enrich explanation; it cannot authorize or execute actions.
 */
export async function reasonAboutCouncil(
  council: NuvaAgentCouncilResult,
  context: {
    revenue: number;
    cashAvailable: number;
    projectedCash30d: number;
    overdueReceivables: number;
    lowStockSkus: number;
    stockoutRisk: number;
    complianceReadiness: number | null;
  },
): Promise<NuvaAgentReasoning | null> {
  if (process.env.NUVA_AGENT_REASONING_ENABLED?.trim().toLowerCase() !== "true") return null;
  if (!council.consensus.priority || !["critical", "high"].includes(council.consensus.priority.severity)) return null;

  let model;
  try {
    model = getChatModel();
  } catch {
    return null;
  }

  const priority = council.consensus.priority;
  const prompt = `Analiza una decisión empresarial ya calculada por Nüva One. No cambies la prioridad, no inventes datos y no ejecutes ninguna acción.

CONTEXTO ESTRUCTURADO:
${JSON.stringify({
    metrics: context,
    priority,
    consensus: {
      confidence: council.consensus.confidence,
      agreement: council.consensus.agreement,
      evidenceQuality: council.consensus.evidenceQuality,
      dissent: council.consensus.dissent,
    },
  })}

Devuelve SOLO JSON válido con:
{
  "rationale": "explicación breve basada únicamente en los datos",
  "conflictResolution": "cómo interpretar la principal tensión entre agentes, o 'Sin conflicto relevante'",
  "missingData": ["datos que faltan para elevar la certeza"],
  "recommendedNextStep": "siguiente paso reversible y verificable"
}`;

  try {
    const { text } = await generateText({
      model,
      system: "Eres Nüva Reasoning Layer. Trabajas sobre evidencia estructurada. No puedes modificar prioridades, autorizar acciones ni afirmar hechos que no estén en los datos.",
      prompt,
      temperature: 0,
    });
    const parsed = ReasoningSchema.safeParse(parseJson(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
