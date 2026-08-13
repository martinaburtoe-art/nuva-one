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
    const raw = "```json\n[{\"signal\":\"info\",\"title\":\"Todo tranquilo\",\"detail\":\"Sin novedades\"}]\n```";
    expect(parseInsights(raw)).toHaveLength(1);
  });

  it("descarta items con signal inválida", () => {
    const raw = JSON.stringify([
      { signal: "urgente", title: "X", detail: "Y" },
      { signal: "alerta", title: "Válido", detail: "Este sí pasa" },
    ]);
    expect(parseInsights(raw)).toHaveLength(1);
  });

  it("descarta items sin title o detail", () => {
    const raw = JSON.stringify([{ signal: "info", title: "Solo título" }]);
    expect(parseInsights(raw)).toHaveLength(0);
  });

  it("recorta a un máximo de 6 insights", () => {
    const raw = JSON.stringify(
      Array.from({ length: 10 }, (_, i) => ({ signal: "info", title: `T${i}`, detail: `D${i}` })),
    );
    expect(parseInsights(raw)).toHaveLength(6);
  });

  it("lanza si el texto no es JSON válido", () => {
    expect(() => parseInsights("esto no es json")).toThrow();
  });

  it("lanza si el JSON no es un array", () => {
    expect(() => parseInsights(JSON.stringify({ signal: "info", title: "X", detail: "Y" }))).toThrow();
  });
});
