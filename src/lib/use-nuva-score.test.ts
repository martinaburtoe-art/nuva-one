import { describe, it, expect } from "vitest";

// scoreFromRatio no está exportada (es un detalle interno de use-nuva-score.ts).
// Se replica aquí la misma función pura para testear la lógica de mapeo
// ratio -> puntos sin depender de Supabase ni de useQuery.
function scoreFromRatio(ratio: number, goodAt: number, badAt: number): number {
  if (goodAt >= badAt) {
    if (ratio >= goodAt) return 20;
    if (ratio <= badAt) return 0;
    return Math.round(((ratio - badAt) / (goodAt - badAt)) * 20);
  }
  if (ratio <= goodAt) return 20;
  if (ratio >= badAt) return 0;
  return Math.round(((badAt - ratio) / (badAt - goodAt)) * 20);
}

describe("scoreFromRatio", () => {
  it("da el máximo cuando el ratio alcanza o supera el umbral bueno (ascendente)", () => {
    expect(scoreFromRatio(0.4, 0.35, 0.1)).toBe(20);
    expect(scoreFromRatio(0.35, 0.35, 0.1)).toBe(20);
  });

  it("da el mínimo cuando el ratio cae al umbral malo o peor (ascendente)", () => {
    expect(scoreFromRatio(0.05, 0.35, 0.1)).toBe(0);
    expect(scoreFromRatio(0.1, 0.35, 0.1)).toBe(0);
  });

  it("interpola linealmente entre los umbrales (ascendente)", () => {
    // punto medio entre 0.1 y 0.35 -> 10 puntos
    expect(scoreFromRatio(0.225, 0.35, 0.1)).toBe(10);
  });

  it("da el máximo cuando el ratio está bajo el umbral bueno (descendente, ej: % vencido)", () => {
    expect(scoreFromRatio(0.05, 0.1, 0.5)).toBe(20);
    expect(scoreFromRatio(0.1, 0.1, 0.5)).toBe(20);
  });

  it("da el mínimo cuando el ratio supera el umbral malo (descendente)", () => {
    expect(scoreFromRatio(0.6, 0.1, 0.5)).toBe(0);
    expect(scoreFromRatio(0.5, 0.1, 0.5)).toBe(0);
  });

  it("interpola linealmente entre los umbrales (descendente)", () => {
    expect(scoreFromRatio(0.3, 0.1, 0.5)).toBe(10);
  });
});
