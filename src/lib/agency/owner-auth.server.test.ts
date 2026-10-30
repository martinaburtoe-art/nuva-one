import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getEnvMock, getUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getEnvMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));
vi.mock("@/lib/supabase-env.server", () => ({ getServerSupabaseEnv: getEnvMock }));

import { authorizeAgencyOwner, isPlatformOwner } from "./owner-auth.server";

describe("Agency server-side owner authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEnvMock.mockReturnValue({
      url: "https://unit-test.supabase.co",
      anonKey: "unit-test-publishable-key",
      ok: true,
    });
    createClientMock.mockReturnValue({ auth: { getUser: getUserMock } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects requests without a bearer token before creating a client", async () => {
    const result = await authorizeAgencyOwner(new Request("https://nuva.test/api/owner/agency-status"));
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid or expired session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });
    const result = await authorizeAgencyOwner(new Request("https://nuva.test/api/owner/agency-status", {
      headers: { Authorization: "Bearer invalid-token" },
    }));
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("does not accept a role supplied only through user_metadata", () => {
    expect(isPlatformOwner({ user_metadata: { platform_role: "owner" } })).toBe(false);
    expect(isPlatformOwner({ app_metadata: { platform_role: "member" } })).toBe(false);
    expect(isPlatformOwner(null)).toBe(false);
  });

  it("rejects authenticated non-owners", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", app_metadata: { platform_role: "member" } } },
      error: null,
    });
    const result = await authorizeAgencyOwner(new Request("https://nuva.test/api/owner/agency-status", {
      headers: { Authorization: "Bearer member-token" },
    }));
    expect(result).toMatchObject({ ok: false, status: 403, error: "AGENCY_ACCESS_DENIED" });
  });

  it("accepts only an owner role from app_metadata", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "owner-1", app_metadata: { platform_role: "owner" } } },
      error: null,
    });
    const result = await authorizeAgencyOwner(new Request("https://nuva.test/api/owner/agency-status", {
      headers: { Authorization: "Bearer owner-token" },
    }));
    expect(result).toEqual({ ok: true, userId: "owner-1", accessToken: "owner-token" });
  });

  it("returns 503 when server authentication configuration is absent", async () => {
    getEnvMock.mockReturnValue({ url: "", anonKey: "", ok: false });
    const result = await authorizeAgencyOwner(new Request("https://nuva.test/api/owner/agency-status", {
      headers: { Authorization: "Bearer owner-token" },
    }));
    expect(result).toMatchObject({ ok: false, status: 503 });
  });
});
