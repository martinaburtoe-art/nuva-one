import { describe, expect, it } from "vitest";
import {
  buildMediaRequests,
  classifyStudioSteps,
  summarizeExecution,
} from "@/lib/nuva-studio-execution.server";

describe("nuva studio execution engine", () => {
  it("separates text and media work without dropping either", () => {
    const result = classifyStudioSteps([
      { index: 0, capability: "research", instruction: "Investiga", dependsOn: [] },
      { index: 1, capability: "image", instruction: "Crea una pieza", dependsOn: [0] },
      { index: 2, capability: "voice", instruction: "Genera voz", dependsOn: [1] },
      { index: 3, capability: "marketing", instruction: "Escribe campaña", dependsOn: [0] },
    ]);

    expect(result.text.map((step) => step.capability)).toEqual(["research", "marketing"]);
    expect(result.media.map((step) => step.capability)).toEqual(["image", "voice"]);
  });

  it("maps media work to current native provider models", () => {
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

  it("returns partial instead of pretending a media step completed", () => {
    const result = summarizeExecution(
      [{ step: 0, capability: "research", result: "Hallazgos" }],
      [
        {
          step: 1,
          capability: "image",
          status: "ready",
          input: "Imagen",
          recommendedModel: "gemini-3.1-flash-image",
        },
      ],
    );

    expect(result.status).toBe("partial");
    expect(result.completed).toHaveLength(1);
    expect(result.media).toHaveLength(1);
    expect(result.nextAction).toContain("adapters especializados");
  });
});
