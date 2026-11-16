import { describe, expect, it } from "vitest";
import { goalsLabel } from "@/lib/resumen-goals";

describe("goalsLabel (onboarding del dashboard)", () => {
  it.each([
    ["sales", "ventas"],
    ["inventory", "inventario"],
    ["finance", "finanzas"],
    ["customers", "clientes"],
  ])("mapea el objetivo %s a su etiqueta", (value, expected) => {
    expect(goalsLabel(value)).toBe(expected);
  });

  it("devuelve 'todo el negocio' para cualquier valor no reconocido", () => {
    expect(goalsLabel("Todo")).toBe("todo el negocio");
    expect(goalsLabel("")).toBe("todo el negocio");
    expect(goalsLabel("desconocido")).toBe("todo el negocio");
  });
});
