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


import { getResumenOperationalStatus } from "@/lib/resumen-operational-status";

describe("getResumenOperationalStatus", () => {
  it("no declara el negocio en orden mientras carga", () => {
    expect(getResumenOperationalStatus({
      loading: true, kpisError: false, integrationErrorCount: 0, lowStockCount: 0, net: undefined,
    }).label).toBe("Cargando");
  });

  it("no confunde un fallo de KPIs con un estado saludable", () => {
    const status = getResumenOperationalStatus({
      loading: false, kpisError: true, integrationErrorCount: 0, lowStockCount: 0, net: undefined,
    });
    expect(status.label).toBe("No disponible");
    expect(status.tone).toBe("attention");
  });

  it("marca como parciales los datos cuando falla una integración", () => {
    const status = getResumenOperationalStatus({
      loading: false, kpisError: false, integrationErrorCount: 1, lowStockCount: 0, net: 120000,
    });
    expect(status.label).toBe("Datos parciales");
    expect(status.tone).toBe("attention");
  });

  it("solicita revisión cuando hay stock bajo o resultado negativo", () => {
    expect(getResumenOperationalStatus({
      loading: false, kpisError: false, integrationErrorCount: 0, lowStockCount: 2, net: 120000,
    }).label).toBe("Requiere revisión");
    expect(getResumenOperationalStatus({
      loading: false, kpisError: false, integrationErrorCount: 0, lowStockCount: 0, net: -1,
    }).label).toBe("Requiere revisión");
  });

  it("declara en orden solo con indicadores completos y sin alertas", () => {
    expect(getResumenOperationalStatus({
      loading: false, kpisError: false, integrationErrorCount: 0, lowStockCount: 0, net: 120000,
    }).label).toBe("En orden");
  });
});
