import { describe, expect, it } from "vitest";
import { groupMobileNavigation, splitMobileNavigation } from "@/lib/mobile-navigation";

const items = [
  { to: "/dashboard", label: "Resumen", section: "Operación" },
  { to: "/pos", label: "Caja", section: "Operación" },
  { to: "/sales", label: "Ventas", section: "Operación" },
  { to: "/inventory", label: "Inventario", section: "Operación" },
  { to: "/customers", label: "Clientes", section: "Operación" },
  { to: "/finance", label: "Finanzas", section: "Finanzas" },
  { to: "/people", label: "Nüva People", section: "Personas" },
];

describe("splitMobileNavigation", () => {
  it("mantiene los cuatro accesos prioritarios y conserva todos los secundarios", () => {
    const result = splitMobileNavigation(items);
    expect(result.primary.map((item) => item.to)).toEqual([
      "/dashboard", "/pos", "/sales", "/inventory",
    ]);
    expect(result.more.map((item) => item.to)).toEqual([
      "/customers", "/finance", "/people",
    ]);
    expect([...result.primary, ...result.more]).toHaveLength(items.length);
  });

  it("filtra solo el directorio secundario y no oculta los accesos principales", () => {
    const result = splitMobileNavigation(items, "finanzas");
    expect(result.primary).toHaveLength(4);
    expect(result.more.map((item) => item.to)).toEqual(["/finance"]);
  });

  it("devuelve resultados vacíos para una búsqueda sin coincidencias", () => {
    const result = splitMobileNavigation(items, "módulo inexistente");
    expect(result.primary).toHaveLength(4);
    expect(result.more).toEqual([]);
  });

  it("encuentra módulos aunque la búsqueda omita tildes", () => {
    const result = splitMobileNavigation([
      ...items,
      { to: "/finance-accounting", label: "Contabilidad y tributación", section: "Finanzas" },
    ], "tributacion");
    expect(result.more.map((item) => item.to)).toContain("/finance-accounting");
  });

  it("respeta el orden y no duplica elementos", () => {
    const result = splitMobileNavigation(items);
    const all = [...result.primary, ...result.more];
    expect(new Set(all.map((item) => item.to)).size).toBe(items.length);
  });
});

describe("groupMobileNavigation", () => {
  it("groups secondary modules by section and preserves section and item order", () => {
    const grouped = groupMobileNavigation([
      { to: "/customers", label: "Clientes", section: "Ventas y clientes" },
      { to: "/quotes", label: "Cotizaciones", section: "Ventas y clientes" },
      { to: "/finance", label: "Finanzas", section: "Finanzas" },
      { to: "/help", label: "Ayuda" },
    ]);
    expect(grouped.map(([section]) => section)).toEqual([
      "Ventas y clientes", "Finanzas", "Otros",
    ]);
    expect(grouped[0][1].map((item) => item.to)).toEqual(["/customers", "/quotes"]);
    expect(grouped[2][1].map((item) => item.to)).toEqual(["/help"]);
  });

  it("does not mutate or drop authorized navigation items", () => {
    const source = [...items];
    const grouped = groupMobileNavigation(source);
    expect(grouped.flatMap(([, entries]) => entries)).toEqual(source);
    expect(source).toEqual(items);
  });
});
