import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
const fromMock = vi.fn((..._args: unknown[]) => ({ insert: insertMock }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

const { checkRateLimit } = await import("./rate-limit.server");

describe("checkRateLimit", () => {
  afterEach(() => {
    rpcMock.mockReset();
    insertMock.mockClear();
    fromMock.mockClear();
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

  it("fails CLOSED (returns false) when the RPC errors, so protected endpoints cannot become unlimited", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValue({ data: null, error: new Error("connection refused") });
    await expect(checkRateLimit("bucket:1", 10, 3600)).resolves.toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("persists a system_alerts row when the RPC errors, so the outage is queryable later", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValue({ data: null, error: new Error("connection refused") });
    await checkRateLimit("bucket:1", 10, 3600);
    expect(fromMock).toHaveBeenCalledWith("system_alerts");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "rate_limit_fail_closed",
        message: 'check_rate_limit RPC failed for bucket "bucket:1"; request blocked',
      }),
    );
    vi.restoreAllMocks();
  });

  it("still returns false (never throws) even if persisting the alert itself fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValue({ data: null, error: new Error("connection refused") });
    insertMock.mockRejectedValueOnce(new Error("insert failed"));
    await expect(checkRateLimit("bucket:1", 10, 3600)).resolves.toBe(false);
    vi.restoreAllMocks();
  });
});
