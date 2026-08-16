import { describe, it, expect } from "vitest";
import { parseInsights } from "./explain";

describe("parseInsights", () => {
  it("parsea un array JSON válido de insights", () => {
    const raw = JSON.stringify([
      { signal: "critico", title: "Stock crítico", detail: "3 productos bajo el mínimo" },
      { signal: "positivo", title: "Buen mes", detail: "Ventas subieron 12%" },
    ]);
    expect(parseInsights(raw)).toHaveLength(2);
  });

  it("despoja fences de markdown antes de parsear", () => {
    const raw =
      '```json\n[{"signal":"info","title":"Todo tranquilo","detail":"Sin novedades"}]\n```';
    expect(parseInsights(raw)).toHaveLength(1);
  });

  it("descarta items con signal inválida", () => {
    const raw = JSON.stringify([
      { signal: "critico", title: "OK", detail: "válido" },
      { signal: "desconocido", title: "No", detail: "inválido" },
    ]);
    expect(parseInsights(raw)).toHaveLength(1);
  });

  it("limita el resultado al máximo esperado", () => {
    const raw = JSON.stringify(
      Array.from({ length: 12 }, (_, i) => ({
        signal: "info",
        title: `Insight ${i}`,
        detail: "detalle",
      })),
    );
    expect(parseInsights(raw)).toHaveLength(8);
  });
});
