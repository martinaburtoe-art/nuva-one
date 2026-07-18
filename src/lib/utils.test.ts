import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges plain class strings", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("lets a later conflicting Tailwind class win (tailwind-merge behavior)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    const isHidden = false;
    expect(cn("px-2", isHidden && "hidden", undefined, null, "py-1")).toBe("px-2 py-1");
  });

  it("applies conditional classes from an object", () => {
    expect(cn("base", { "text-red-500": true, "text-blue-500": false })).toBe("base text-red-500");
  });
});
