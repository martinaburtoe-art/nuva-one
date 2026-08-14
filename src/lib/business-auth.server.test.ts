import { describe, it, expect } from "vitest";
import { isBusinessMember } from "./business-auth.server";

// Minimal fake matching the shape isBusinessMember reads from a Supabase
// client: .from(...).select(...).eq(...).eq(...).maybeSingle().
function fakeSupabase(result: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => result,
          }),
        }),
      }),
    }),
  } as any;
}

describe("isBusinessMember", () => {
  it("devuelve true cuando existe una fila de membresía", async () => {
    const supabase = fakeSupabase({ data: { id: "m1" }, error: null });
    expect(await isBusinessMember(supabase, "biz-1", "user-1")).toBe(true);
  });

  it("devuelve false cuando no hay fila (no es miembro)", async () => {
    const supabase = fakeSupabase({ data: null, error: null });
    expect(await isBusinessMember(supabase, "biz-1", "user-1")).toBe(false);
  });

  it("devuelve false si la consulta devuelve error", async () => {
    const supabase = fakeSupabase({ data: null, error: { message: "boom" } });
    expect(await isBusinessMember(supabase, "biz-1", "user-1")).toBe(false);
  });

  it("devuelve false sin businessId, sin consultar la base", async () => {
    const supabase = fakeSupabase({ data: { id: "m1" }, error: null });
    expect(await isBusinessMember(supabase, "", "user-1")).toBe(false);
  });

  it("devuelve false sin userId, sin consultar la base", async () => {
    const supabase = fakeSupabase({ data: { id: "m1" }, error: null });
    expect(await isBusinessMember(supabase, "biz-1", "")).toBe(false);
  });
});
