import { describe, expect, it } from "vitest";
import { assertOperationalSourcesAvailable } from "./operational-source-guard";

describe("assertOperationalSourcesAvailable", () => {
  it("accepts a complete operational snapshot", () => {
    expect(() =>
      assertOperationalSourcesAvailable([
        { name: "ventas", error: null },
        { name: "compras", error: null },
        { name: "caja y finanzas", error: null },
        { name: "inventario", error: null },
      ]),
    ).not.toThrow();
  });

  it("fails closed and names every unavailable source", () => {
    expect(() =>
      assertOperationalSourcesAvailable([
        { name: "ventas", error: null },
        { name: "compras", error: { message: "timeout" } },
        { name: "caja y finanzas", error: null },
        { name: "inventario", error: { message: "permission denied" } },
      ]),
    ).toThrow(/compras: timeout.*inventario: permission denied/);
  });

  it("does not treat an empty but successfully fetched source as an error", () => {
    expect(() => assertOperationalSourcesAvailable([{ name: "ventas", error: null }])).not.toThrow();
  });
});
