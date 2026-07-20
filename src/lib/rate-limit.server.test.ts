import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const { checkRateLimit } = await import("./rate-limit.server");

describe("checkRateLimit", () => {
  afterEach(() => {
    rpcMock.mockReset();
  });

  it("returns true when the RPC allows the request", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await expect(checkRateLimit("bucket:1", 10, 3600)).resolves.toBe(true);
  });

  it("returns false when the RPC reports the bucket is over limit", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    await expect(checkRateLimit("bucket:1", 10, 3600)).resolves.toBe(false);
  });

  it("calls check_rate_limit with the given bucket/limit/window", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await checkRateLimit("checkout:user-123", 10, 3600);
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_bucket_key: "checkout:user-123",
      p_max_requests: 10,
      p_window_seconds: 3600,
    });
  });

  it("fails OPEN (returns true) when the RPC errors, so an outage doesn't block checkout", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValue({ data: null, error: new Error("connection refused") });
    await expect(checkRateLimit("bucket:1", 10, 3600)).resolves.toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
