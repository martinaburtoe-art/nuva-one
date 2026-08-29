import type { AiCapability } from "@/lib/ai-gateway/types";

export type StudioExecutionStatus = "completed" | "partial" | "blocked" | "failed";
export type StudioStepStatus = "pending" | "running" | "completed" | "queued" | "blocked" | "failed";

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

export type StudioStepState = {
  step: number;
  capability: AiCapability;
  status: StudioStepStatus;
  attempts: number;
  result?: string;
  error?: string;
};

export type StudioExecutionCheckpoint = {
  executionId: string;
  version: 1;
  status: StudioExecutionStatus | "running";
  steps: StudioStepState[];
  updatedAt: string;
};

const MEDIA_CAPABILITIES = new Set<AiCapability>(["image", "image_edit", "video", "voice"]);

export function classifyStudioSteps(steps: StudioExecutionStep[]) {
  return steps.reduce((acc, step) => {
    (MEDIA_CAPABILITIES.has(step.capability) ? acc.media : acc.text).push(step);
    return acc;
  }, { text: [] as StudioExecutionStep[], media: [] as StudioExecutionStep[] });
}

export function validateStudioPlan(steps: StudioExecutionStep[]): string[] {
  const errors: string[] = [];
  const indexes = new Set(steps.map((step) => step.index));
  if (steps.length === 0) errors.push("El plan no contiene pasos.");
  if (steps.length > 6) errors.push("El plan excede el máximo de 6 pasos.");
  if (indexes.size !== steps.length) errors.push("El plan contiene índices duplicados.");
  for (const step of steps) {
    if (!Number.isInteger(step.index) || step.index < 0) errors.push(`Paso ${step.index} tiene un índice inválido.`);
    if (!step.instruction.trim()) errors.push(`Paso ${step.index} no tiene instrucción.`);
    if (step.dependsOn.includes(step.index)) errors.push(`Paso ${step.index} depende de sí mismo.`);
    for (const dependency of step.dependsOn) {
      if (!indexes.has(dependency)) errors.push(`Paso ${step.index} referencia una dependencia inexistente: ${dependency}.`);
      if (dependency >= step.index) errors.push(`Paso ${step.index} referencia una dependencia futura: ${dependency}.`);
    }
  }
  return errors;
}

export function resolveDependencyResults(step: StudioExecutionStep, outputs: Array<{ step: number; capability: AiCapability; result: string }>): string {
  return step.dependsOn.map((dependency) => outputs.find((output) => output.step === dependency)?.result).filter((result): result is string => Boolean(result)).join("\n\n");
}

export function buildMediaRequests(steps: StudioExecutionStep[], outputs: Array<{ step: number; capability: AiCapability; result: string }> = []): StudioMediaRequest[] {
  return steps.filter((step) => MEDIA_CAPABILITIES.has(step.capability)).map((step) => {
    const dependencies = resolveDependencyResults(step, outputs);
    const input = [step.instruction, dependencies ? `Contexto generado por pasos anteriores:\n${dependencies}` : ""].filter(Boolean).join("\n\n").slice(0, 24000);
    if (step.capability === "image" || step.capability === "image_edit") return { step: step.index, capability: step.capability, status: "ready", input, recommendedModel: "gemini-3.1-flash-image" };
    if (step.capability === "video") return { step: step.index, capability: step.capability, status: "ready", input, recommendedModel: "veo-3.1-generate-preview" };
    return { step: step.index, capability: step.capability, status: "ready", input, recommendedModel: "fish-audio" };
  });
}

export function createExecutionCheckpoint(executionId: string, steps: StudioExecutionStep[]): StudioExecutionCheckpoint {
  return { executionId, version: 1, status: "running", steps: steps.map((step) => ({ step: step.index, capability: step.capability, status: "pending", attempts: 0 })), updatedAt: new Date().toISOString() };
}

export function getRunnableSteps(plan: StudioExecutionStep[], checkpoint: StudioExecutionCheckpoint): StudioExecutionStep[] {
  const state = new Map(checkpoint.steps.map((step) => [step.step, step]));
  const completed = new Set(checkpoint.steps.filter((step) => step.status === "completed").map((step) => step.step));
  return plan.filter((step) => {
    const current = state.get(step.index);
    if (!current || current.status !== "pending") return false;
    return step.dependsOn.every((dependency) => completed.has(dependency));
  });
}

export function markStep(checkpoint: StudioExecutionCheckpoint, step: number, patch: Partial<StudioStepState>): StudioExecutionCheckpoint {
  return { ...checkpoint, steps: checkpoint.steps.map((current) => current.step === step ? { ...current, ...patch } : current), updatedAt: new Date().toISOString() };
}

export function resumeExecution(checkpoint: StudioExecutionCheckpoint): StudioExecutionCheckpoint {
  return { ...checkpoint, status: "running", steps: checkpoint.steps.map((step) => step.status === "running" ? { ...step, status: "pending" } : step), updatedAt: new Date().toISOString() };
}

export function summarizeExecution(completed: StudioExecutionResult["completed"], media: StudioMediaRequest[]): StudioExecutionResult {
  if (media.length === 0) return { status: "completed", completed, media };
  return { status: completed.length > 0 ? "partial" : "blocked", completed, media, nextAction: "Ejecutar los recursos multimedia mediante adapters especializados y anexarlos a la biblioteca de activos de Nüva Studio." };
}
