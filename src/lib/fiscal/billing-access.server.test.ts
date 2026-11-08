import { describe, expect, it, vi } from "vitest";
import { requireBusinessBillingManager } from "./billing-access.server";

function makeClient({
  userId = "user-1",
  businessOwnerId = "user-1",
  role = "owner",
  businessExists = true,
}: {
  userId?: string | null;
  businessOwnerId?: string;
  role?: string;
  businessExists?: boolean;
} = {}) {
  const business = businessExists
    ? {
        id: "business-1",
        name: "Nüva Demo",
        owner_id: businessOwnerId,
        plan: "starter",
        created_at: "2026-11-01T00:00:00.000Z",
        subscription_status: "active",
        billing_provider: "none",
        mercadopago_preapproval_id: null,
      }
    : null;
  const businessQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: business, error: null }),
  };
  const membershipQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }),
  };
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId, email: "owner@example.cl" } : null },
        error: userId ? null : new Error("no session"),
      }),
    },
    from: vi.fn((table: string) => table === "businesses" ? businessQuery : membershipQuery),
  };
  return { client, businessQuery, membershipQuery };
}

describe("requireBusinessBillingManager", () => {
  it("allows the business owner", async () => {
    const { client, membershipQuery } = makeClient();
    const result = await requireBusinessBillingManager(client, "business-1");
    expect(result.ok).toBe(true);
    expect(membershipQuery.maybeSingle).not.toHaveBeenCalled();
  });

  it("allows an admin member", async () => {
    const { client } = makeClient({ businessOwnerId: "other-user", role: "admin" });
    const result = await requireBusinessBillingManager(client, "business-1");
    expect(result.ok).toBe(true);
  });

  it("rejects a regular member", async () => {
    const { client } = makeClient({ businessOwnerId: "other-user", role: "staff" });
    const result = await requireBusinessBillingManager(client, "business-1");
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("rejects unauthenticated requests", async () => {
    const { client, businessQuery } = makeClient({ userId: null });
    const result = await requireBusinessBillingManager(client, "business-1");
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(businessQuery.maybeSingle).not.toHaveBeenCalled();
  });

  it("rejects businesses the caller cannot read", async () => {
    const { client } = makeClient({ businessExists: false });
    const result = await requireBusinessBillingManager(client, "business-1");
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});
