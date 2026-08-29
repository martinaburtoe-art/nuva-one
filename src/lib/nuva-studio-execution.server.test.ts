import { describe, expect, it } from "vitest";
import {
  buildMediaRequests,
  classifyStudioSteps,
  createExecutionCheckpoint,
  getRunnableSteps,
  markStep,
  resolveDependencyResults,
  resumeExecution,
  summarizeExecution,
  validateStudioPlan,
} from "@/lib/nuva-studio-execution.server";

describe("nuva studio execution engine", () => {
  const plan = [
    { index: 0, capability: "research" as const, instruction: "Investiga", dependsOn: [] },
    { index: 1, capability: "image" as const, instruction: "Crea una pieza", dependsOn: [0] },
    { index: 2, capability: "voice" as const, instruction: "Genera voz", dependsOn: [1] },
    { index: 3, capability: "marketing" as const, instruction: "Escribe campaña", dependsOn: [0] },
  ];

  it("separates text and media work without dropping either", () => {
    const result = classifyStudioSteps(plan);
    expect(result.text.map((step) => step.capability)).toEqual(["research", "marketing"]);
    expect(result.media.map((step) => step.capability)).toEqual(["image", "voice"]);
  });

  it("validates dependency ids instead of relying on array positions", () => {
    const errors = validateStudioPlan([
      { index: 0, capability: "research", instruction: "Investiga", dependsOn: [] },
      { index: 2, capability: "marketing", instruction: "Campaña", dependsOn: [0] },
      { index: 3, capability: "copywriting", instruction: "Copy", dependsOn: [99] },
    ]);
    expect(errors).toContain("Paso 3 referencia una dependencia inexistente: 99.");
  });

  it("resolves dependencies by original step id", () => {
    expect(resolveDependencyResults({ index: 4, capability: "marketing", instruction: "Campaña", dependsOn: [2] }, [
      { step: 0, capability: "research", result: "Hallazgos" },
      { step: 2, capability: "strategy", result: "Estrategia" },
    ])).toBe("Estrategia");
  });

  it("propagates completed context into media requests", () => {
    const media = buildMediaRequests(
      [{ index: 2, capability: "image", instruction: "Crear pieza", dependsOn: [0] }],
      [{ step: 0, capability: "marketing", result: "Campaña de septiembre" }],
    );
    expect(media[0]?.input).toContain("Campaña de septiembre");
  });

  it("maps media work to current provider models", () => {
    const media = buildMediaRequests([
      { index: 1, capability: "image", instruction: "Producto", dependsOn: [] },
      { index: 2, capability: "video", instruction: "Reel", dependsOn: [1] },
      { index: 3, capability: "voice", instruction: "Locución", dependsOn: [2] },
    ]);
    expect(media).toEqual([
      expect.objectContaining({ capability: "image", recommendedModel: "gemini-3.1-flash-image" }),
      expect.objectContaining({ capability: "video", recommendedModel: "veo-3.1-generate-preview" }),
      expect.objectContaining({ capability: "voice", recommendedModel: "fish-audio" }),
    ]);
  });

  it("finds only runnable pending steps", () => {
    const checkpoint = createExecutionCheckpoint("exec-1", plan);
    expect(getRunnableSteps(plan, checkpoint).map((step) => step.index)).toEqual([0]);
    const afterResearch = markStep(checkpoint, 0, { status: "completed", result: "Hallazgos", attempts: 1 });
    expect(getRunnableSteps(plan, afterResearch).map((step) => step.index)).toEqual([1, 3]);
  });

  it("resumes interrupted running steps without re-running completed work", () => {
    let checkpoint = createExecutionCheckpoint("exec-2", plan);
    checkpoint = markStep(checkpoint, 0, { status: "completed", result: "Hallazgos", attempts: 1 });
    checkpoint = markStep(checkpoint, 1, { status: "running", attempts: 1 });
    checkpoint = markStep(checkpoint, 3, { status: "completed", result: "Campaña", attempts: 1 });
    const resumed = resumeExecution(checkpoint);
    expect(resumed.steps.find((step) => step.step === 0)?.status).toBe("completed");
    expect(resumed.steps.find((step) => step.step === 1)?.status).toBe("pending");
    expect(resumed.steps.find((step) => step.step === 3)?.status).toBe("completed");
    expect(getRunnableSteps(plan, resumed).map((step) => step.index)).toEqual([1]);
  });

  it("returns partial instead of pretending a media step completed", () => {
    const result = summarizeExecution(
      [{ step: 0, capability: "research", result: "Hallazgos" }],
      [{ step: 1, capability: "image", status: "ready", input: "Imagen", recommendedModel: "gemini-3.1-flash-image" }],
    );
    expect(result.status).toBe("partial");
    expect(result.completed).toHaveLength(1);
    expect(result.media).toHaveLength(1);
    expect(result.nextAction).toContain("adapters especializados");
  });
});
