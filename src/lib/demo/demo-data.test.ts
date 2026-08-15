import { describe, expect, it } from "vitest";
import { DEMO_BUSINESS, DEMO_CUSTOMERS, DEMO_PRODUCTS, money } from "./demo-data";
import { demoAiAnswer } from "./demo-ai";
import { DEMO_STEPS } from "@/components/demo/guided-tour";

describe("guided demo", () => {
  it("uses the fictional Alma Café business", () => expect(DEMO_BUSINESS.name).toBe("Alma Café"));
  it("has no empty product catalog", () => expect(DEMO_PRODUCTS.length).toBeGreaterThan(0));
  it("has customers for the CRM demo", () => expect(DEMO_CUSTOMERS.length).toBeGreaterThan(0));
  it("formats Chilean currency", () => expect(money(8990)).toContain("8.990"));
  it("flags products at or below reorder level", () => expect(DEMO_PRODUCTS.some((p) => p.stock <= p.reorderAt)).toBe(true));
  it("answers inventory questions locally", () => expect(demoAiAnswer("¿Cómo está el inventario?")).toContain("productos"));
  it("answers recommendation questions locally", () => expect(demoAiAnswer("¿Qué recomiendas?")).toContain("Priorizaría"));
  it("answers suggestion questions locally", () => expect(demoAiAnswer("¿Qué sugieres hacer?")).toContain("Priorizaría"));
  it("contains the complete nine-step tour", () => expect(DEMO_STEPS).toHaveLength(9));
});
