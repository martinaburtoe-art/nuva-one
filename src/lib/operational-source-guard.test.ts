import { describe, expect, it } from "vitest";
import { assertOperationalSourcesAvailable } from "./operational-source-guard";

describe("assertOperationalSourcesAvailable", () => {
  it("accepts a complete operational snapshot", () => {
    expect(() =>
      assertOperationalSourcesAvailable([
        { name: "ventas", data: [], error: null },
        { name: "compras", data: [], error: null },
        { name: "caja y finanzas", data: [], error: null },
        { name: "inventario", data: [], error: null },
      ]),
    ).not.toThrow();
  });

  it("fails closed and names every unavailable source", () => {
    expect(() =>
      assertOperationalSourcesAvailable([
        { name: "ventas", data: [], error: null },
        { name: "compras", data: null, error: { message: "timeout" } },
        { name: "caja y finanzas", data: [], error: null },
        { name: "inventario", data: null, error: { message: "permission denied" } },
      ]),
    ).toThrow(/compras: timeout.*inventario: permission denied/);
  });

  it("rejects a null payload even when the query reports no error", () => {
    expect(() =>
      assertOperationalSourcesAvailable([{ name: "ventas", data: null, error: null }]),
    ).toThrow(/ventas: respuesta sin datos/);
  });

  it("accepts an empty array as a valid successful result", () => {
    expect(() =>
      assertOperationalSourcesAvailable([{ name: "ventas", data: [], error: null }]),
    ).not.toThrow();
  });
});
