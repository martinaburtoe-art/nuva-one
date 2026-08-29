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
  completed: Array<{
    step: number;
    capability: AiCapability;
    result: string;
  }>;
  media: StudioMediaRequest[];
  nextAction?: string;
};

const MEDIA_CAPABILITIES = new Set<AiCapability>([
  "image",
  "image_edit",
  "video",
  "voice",
]);

/**
 * Turns a planner output into an execution contract. Media work is represented
 * explicitly instead of being silently downgraded to text. This lets the
 * orchestrator attach native providers (Nano Banana/Veo/Fish/n8n) without
 * coupling the planner to a particular vendor.
 */
export function classifyStudioSteps(
  steps: StudioExecutionStep[],
): { text: StudioExecutionStep[]; media: StudioExecutionStep[] } {
  return steps.reduce(
    (acc, step) => {
      (MEDIA_CAPABILITIES.has(step.capability) ? acc.media : acc.text).push(step);
      return acc;
    },
    { text: [] as StudioExecutionStep[], media: [] as StudioExecutionStep[] },
  );
}

export function buildMediaRequests(steps: StudioExecutionStep[]): StudioMediaRequest[] {
  return steps
    .filter((step) => MEDIA_CAPABILITIES.has(step.capability))
    .map((step) => {
      if (step.capability === "image" || step.capability === "image_edit") {
        return {
          step: step.index,
          capability: step.capability,
          status: "ready",
          input: step.instruction,
          recommendedModel:
            step.capability === "image"
              ? "gemini-3.1-flash-image"
              : "gemini-3.1-flash-image",
        };
      }

      if (step.capability === "video") {
        return {
          step: step.index,
          capability: step.capability,
          status: "ready",
          input: step.instruction,
          recommendedModel: "veo-3.1-generate-preview",
        };
      }

      return {
        step: step.index,
        capability: step.capability,
        status: "ready",
        input: step.instruction,
        recommendedModel: "fish-audio",
      };
    });
}

export function summarizeExecution(
  completed: StudioExecutionResult["completed"],
  media: StudioMediaRequest[],
): StudioExecutionResult {
  if (media.length === 0) {
    return { status: "completed", completed, media };
  }

  return {
    status: completed.length > 0 ? "partial" : "blocked",
    completed,
    media,
    nextAction:
      "Ejecutar los recursos multimedia mediante los adapters especializados y anexarlos a la biblioteca de activos de Nüva Studio.",
  };
}
