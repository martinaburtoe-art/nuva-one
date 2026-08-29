import type { AiCapability } from "@/lib/ai-gateway/types";

export type StudioExecutionStatus = "completed" | "partial" | "blocked";

export type StudioExecutionStep = {
  index: number;
  capability: AiCapability;
  instruction: string;
  dependsOn: number[];
};

export type StudioMediaRequest = {
  step: number;
  capability: Extract<AiCapability, "image" | "image_edit" | "video" | "voice">;
  status: "ready" | "blocked";
  reason?: string;
  input: string;
  recommendedModel?: string;
};

export type StudioExecutionResult = {
  status: StudioExecutionStatus;
  completed: Array<{ step: number; capability: AiCapability; result: string }>;
  media: StudioMediaRequest[];
  nextAction?: string;
};

const MEDIA_CAPABILITIES = new Set<AiCapability>(["image", "image_edit", "video", "voice"]);

export function classifyStudioSteps(steps: StudioExecutionStep[]) {
  return steps.reduce(
    (acc, step) => {
      (MEDIA_CAPABILITIES.has(step.capability) ? acc.media : acc.text).push(step);
      return acc;
    },
    { text: [] as StudioExecutionStep[], media: [] as StudioExecutionStep[] },
  );
}

export function validateStudioPlan(steps: StudioExecutionStep[]): string[] {
  const errors: string[] = [];
  const indexes = new Set(steps.map((step) => step.index));
  if (steps.length === 0) errors.push("El plan no contiene pasos.");
  if (steps.length > 6) errors.push("El plan excede el máximo de 6 pasos.");
  if (indexes.size !== steps.length) errors.push("El plan contiene índices duplicados.");

  for (const step of steps) {
    if (!step.instruction.trim()) errors.push(`Paso ${step.index} no tiene instrucción.`);
    if (step.dependsOn.includes(step.index)) errors.push(`Paso ${step.index} depende de sí mismo.`);
    for (const dependency of step.dependsOn) {
      if (!indexes.has(dependency)) errors.push(`Paso ${step.index} referencia una dependencia inexistente: ${dependency}.`);
      if (dependency >= step.index) errors.push(`Paso ${step.index} referencia una dependencia futura: ${dependency}.`);
    }
  }

  return errors;
}

export function resolveDependencyResults(
  step: StudioExecutionStep,
  outputs: Array<{ step: number; capability: AiCapability; result: string }>,
): string {
  return step.dependsOn
    .map((dependency) => outputs.find((output) => output.step === dependency)?.result)
    .filter((result): result is string => Boolean(result))
    .join("\n\n");
}

export function buildMediaRequests(
  steps: StudioExecutionStep[],
  outputs: Array<{ step: number; capability: AiCapability; result: string }> = [],
): StudioMediaRequest[] {
  return steps.filter((step) => MEDIA_CAPABILITIES.has(step.capability)).map((step) => {
    const dependencies = resolveDependencyResults(step, outputs);
    const input = [
      step.instruction,
      dependencies ? `Contexto generado por pasos anteriores:\n${dependencies}` : "",
    ].filter(Boolean).join("\n\n").slice(0, 24000);

    if (step.capability === "image" || step.capability === "image_edit") {
      return { step: step.index, capability: step.capability, status: "ready", input, recommendedModel: "gemini-3.1-flash-image" };
    }
    if (step.capability === "video") {
      return { step: step.index, capability: step.capability, status: "ready", input, recommendedModel: "veo-3.1-generate-preview" };
    }
    return { step: step.index, capability: step.capability, status: "ready", input, recommendedModel: "fish-audio" };
  });
}

export function summarizeExecution(
  completed: StudioExecutionResult["completed"],
  media: StudioMediaRequest[],
): StudioExecutionResult {
  if (media.length === 0) return { status: "completed", completed, media };
  return {
    status: completed.length > 0 ? "partial" : "blocked",
    completed,
    media,
    nextAction: "Ejecutar los recursos multimedia mediante adapters especializados y anexarlos a la biblioteca de activos de Nüva Studio.",
  };
}
