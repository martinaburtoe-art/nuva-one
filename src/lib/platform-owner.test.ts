import { describe, expect, it } from "vitest";
import { isPlatformOwner } from "./platform-owner";

describe("isPlatformOwner", () => {
  it("acepta el claim platform_role=owner en app_metadata", () => {
    expect(isPlatformOwner({ app_metadata: { platform_role: "owner" } })).toBe(true);
  });

  it("rechaza usuarios sin claim", () => {
    expect(isPlatformOwner({ app_metadata: {} })).toBe(false);
  });

  it("rechaza otros roles de plataforma", () => {
    expect(isPlatformOwner({ app_metadata: { platform_role: "admin" } })).toBe(false);
  });

  it("no confunde el member_role de negocio con el rol de plataforma", () => {
    expect(isPlatformOwner({ app_metadata: { role: "owner" } })).toBe(false);
    expect(isPlatformOwner({ user_metadata: { role: "owner" } } as never)).toBe(false);
  });

  it("rechaza usuario nulo o sin app_metadata", () => {
    expect(isPlatformOwner(null)).toBe(false);
    expect(isPlatformOwner(undefined)).toBe(false);
    expect(isPlatformOwner({} as never)).toBe(false);
  });
});
