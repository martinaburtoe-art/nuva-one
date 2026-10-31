import { describe, expect, it } from "vitest";

describe("Nüva Agency QA smoke", () => {
  it("ejecuta una aserción real en un proceso Vitest separado", () => {
    expect(2 + 2).toBe(4);
  });
});
