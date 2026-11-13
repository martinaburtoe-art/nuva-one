import { describe, expect, it } from "vitest";
import { serializeIndustryAnswers } from "@/lib/industry-profile-answers";

describe("industry profile answers", () => {
  it("persists only explicit answers from the selected profile", () => {
    expect(serializeIndustryAnswers("hardware_store", {
      operation_1: "yes",
      operation_2: "no",
      operation_3: undefined,
      unrelated: "yes",
    })).toEqual({ operation_1: true, operation_2: false });
  });

  it("does not infer answers for unanswered questions or unknown profiles", () => {
    expect(serializeIndustryAnswers("neighborhood_grocery", {})).toEqual({});
    expect(serializeIndustryAnswers("unknown", { operation_1: "yes" })).toEqual({});
  });
});
