import { describe, expect, it } from "vitest";
import { goalsLabel } from "@/lib/resumen-goals";
import { getResumenOperationalStatus } from "@/lib/resumen-operational-status";
import { buildResumenChartData } from "@/lib/resumen-chart-data";
import { calculateInventoryValueAtCost } from "@/lib/resumen-inventory-value";
import { fetchAllResumenRows } from "@/lib/resumen-fetch-all";

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

describe("buildResumenChartData", () => {
  it("incluye días sin movimientos y respeta el filtro de categoría", () => {
    const rows = buildResumenChartData([
      { tx_date: "2026-11-02", type: "income", amount: 120000, category: "Ventas" },
      { tx_date: "2026-11-02", type: "expense", amount: 25000, category: "Operación" },
      { tx_date: "2026-11-03", type: "income", amount: 80000, category: "Ventas" },
    ], { from: "2026-11-01", to: "2026-11-03", categories: ["Ventas"], daily: true });
    expect(rows).toHaveLength(3);
    expect(rows[0].ingresos).toBe(0);
    expect(rows[0].gastos).toBe(0);
    expect(rows[1].ingresos).toBe(120000);
    expect(rows[1].gastos).toBe(0);
    expect(rows[2].ingresos).toBe(80000);
  });

  it("devuelve todos los días en cero cuando el rango no tiene movimientos", () => {
    const rows = buildResumenChartData([], {
      from: "2026-11-01", to: "2026-11-03", categories: [], daily: true,
    });
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.ingresos === 0 && row.gastos === 0)).toBe(true);
  });

  it("mantiene todos los meses de un rango histórico, no solo los últimos seis", () => {
    const rows = buildResumenChartData([
      { tx_date: "2025-01-12", type: "income", amount: 100000, category: "Ventas" },
      { tx_date: "2025-03-04", type: "expense", amount: 30000, category: "Operación" },
    ], {
      from: "2025-01-01", to: "2025-03-31", categories: [], daily: false,
      now: new Date("2026-11-10T12:00:00"),
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].ingresos).toBe(100000);
    expect(rows[1].ingresos).toBe(0);
    expect(rows[2].gastos).toBe(30000);
  });

  it("permite consultar solo una fecha final incluyendo el histórico anterior", () => {
    const rows = buildResumenChartData([
      { tx_date: "2024-01-15", type: "income", amount: 50000, category: "Ventas" },
      { tx_date: "2025-06-12", type: "expense", amount: 12000, category: "Operación" },
    ], {
      from: null, to: "2025-06-30", categories: [], daily: false,
      now: new Date("2026-11-10T12:00:00"),
    });
    expect(rows).toHaveLength(18);
    expect(rows[0].ingresos).toBe(50000);
    expect(rows[17].gastos).toBe(12000);
  });

  it("muestra seis meses por defecto cuando no hay rango explícito", () => {
    const rows = buildResumenChartData([], {
      from: null, to: null, categories: [], daily: false,
      now: new Date("2026-11-10T12:00:00"),
    });
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.ingresos === 0 && row.gastos === 0)).toBe(true);
  });
});

describe("calculateInventoryValueAtCost", () => {
  it("valora el stock al costo de adquisición, no al precio de venta", () => {
    expect(calculateInventoryValueAtCost([
      { stock: 10, cost: 1200 },
      { stock: "5", cost: "800" },
    ])).toBe(16000);
  });

  it("trata valores nulos como cero y omite importes no finitos", () => {
    expect(calculateInventoryValueAtCost([
      { stock: null, cost: 900 },
      { stock: 4, cost: null },
      { stock: 3, cost: "no-disponible" },
    ])).toBe(0);
  });
});

describe("fetchAllResumenRows", () => {
  it("lee todas las páginas hasta la última página parcial", async () => {
    const rows = await fetchAllResumenRows(async (from, to) => ({
      data: Array.from({ length: Math.min(2, 5 - from) }, (_, i) => from + i).filter((n) => n <= to),
      error: null,
    }), 2);
    expect(rows).toEqual([0, 1, 2, 3, 4]);
  });

  it("hace una sola consulta cuando la primera página está vacía", async () => {
    let calls = 0;
    const rows = await fetchAllResumenRows(async () => {
      calls += 1;
      return { data: [], error: null };
    }, 2);
    expect(rows).toEqual([]);
    expect(calls).toBe(1);
  });

  it("propaga los errores de la consulta en lugar de ocultar datos incompletos", async () => {
    await expect(fetchAllResumenRows(async () => ({
      data: null,
      error: new Error("fallo de lectura"),
    }), 2)).rejects.toThrow("fallo de lectura");
  });
});
