import { beforeEach, describe, expect, it } from "vitest";
import { applySavedImportMapping, getImportMapping, readImportFile, saveImportMapping } from "./universal-import";

const storage = new Map<string, string>();
const localStorageShim = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

describe("universal import", () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorageShim });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: localStorageShim } });
  });

  it("remembers a business-specific column vocabulary", () => {
    saveImportMapping("business-1", { "codigo interno": "sku", "nombre comercial": "name" });
    expect(getImportMapping("business-1")).toEqual({ "codigo interno": "sku", "nombre comercial": "name" });
    expect(applySavedImportMapping("Código Interno,Nombre Comercial,Existencia\nA-1,Camiseta,10", "business-1"))
      .toContain("sku,name,Existencia");
  });

  it("reads CSV and keeps its content intact", async () => {
    const file = new File(["Producto;Existencias\nCamiseta;12"], "inventario.csv", { type: "text/csv" });
    const result = await readImportFile(file);
    expect(result.format).toBe("csv");
    expect(result.text).toContain("Camiseta;12");
  });
});
