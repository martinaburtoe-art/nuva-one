import { describe, expect, it } from "vitest";
import { normalizeModuleSearch, searchModules } from "@/components/module-search";
import { Activity, Package, Users } from "lucide-react";

const modules = [
  { to: "/finance-accounting", label: "Contabilidad y tributación", icon: Activity },
  { to: "/inventory", label: "Inventario", icon: Package },
  { to: "/customers", label: "Clientes", icon: Users },
];

describe("module search", () => {
  it("normalizes accents and case for Spanish queries", () => {
    expect(normalizeModuleSearch("TRIBUTACIÓN")).toBe("tributacion");
    expect(searchModules(modules, "tributacion").map((item) => item.to)).toEqual(["/finance-accounting"]);
  });

  it("returns only matching authorized destinations", () => {
    expect(searchModules(modules, "cli").map((item) => item.to)).toEqual(["/customers"]);
  });

  it("returns no results for an empty or unmatched query", () => {
    expect(searchModules(modules, "")).toEqual([]);
    expect(searchModules(modules, "compras")).toEqual([]);
  });
});
