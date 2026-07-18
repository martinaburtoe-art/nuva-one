import { describe, expect, it } from "vitest";
import { canManageBusiness, isBusinessOwner } from "./use-business";

describe("canManageBusiness", () => {
  it.each(["owner", "admin"] as const)("returns true for role '%s'", (role) => {
    expect(canManageBusiness(role)).toBe(true);
  });

  it.each(["staff", "viewer"] as const)("returns false for role '%s'", (role) => {
    expect(canManageBusiness(role)).toBe(false);
  });

  it("returns false for null/undefined (not yet loaded, or not a member)", () => {
    expect(canManageBusiness(null)).toBe(false);
    expect(canManageBusiness(undefined)).toBe(false);
  });
});

describe("isBusinessOwner", () => {
  it("returns true only for 'owner'", () => {
    expect(isBusinessOwner("owner")).toBe(true);
  });

  it.each(["admin", "staff", "viewer"] as const)("returns false for role '%s'", (role) => {
    expect(isBusinessOwner(role)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isBusinessOwner(null)).toBe(false);
    expect(isBusinessOwner(undefined)).toBe(false);
  });
});
