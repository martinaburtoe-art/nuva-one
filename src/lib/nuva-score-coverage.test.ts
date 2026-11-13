import { describe, expect, it } from "vitest";
import { getNuvaScoreLabel } from "./nuva-score-coverage";

describe("getNuvaScoreLabel", () => {
  it("never labels an incomplete score as excellent or critical", () => {
    expect(getNuvaScoreLabel(100, 1)).toBe("Parcial");
    expect(getNuvaScoreLabel(0, 4)).toBe("Parcial");
  });

  it("uses the health label only when all indicators are available", () => {
    expect(getNuvaScoreLabel(90, 5)).toBe("Excelente");
    expect(getNuvaScoreLabel(75, 5)).toBe("Saludable");
    expect(getNuvaScoreLabel(55, 5)).toBe("Atención");
    expect(getNuvaScoreLabel(20, 5)).toBe("Crítico");
  });
});
