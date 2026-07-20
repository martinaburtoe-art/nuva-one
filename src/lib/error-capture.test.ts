// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeLastCapturedError } from "./error-capture";

// error-capture.ts self-registers global 'error'/'unhandledrejection' listeners
// on import, then exposes consumeLastCapturedError() to read+clear the last one
// within a 5s TTL. We drive it through the real global listeners rather than
// reaching into module internals, since that's the actual public contract
// server.ts relies on.

function dispatchError(error: unknown) {
  globalThis.dispatchEvent(Object.assign(new Event("error"), { error }) as ErrorEvent);
}

describe("consumeLastCapturedError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Drain any captured error so state doesn't leak between tests.
    consumeLastCapturedError();
    vi.useRealTimers();
  });

  it("returns undefined when nothing has been captured", () => {
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("returns the captured error once, then undefined (consumes it)", () => {
    const err = new Error("boom");
    dispatchError(err);
    expect(consumeLastCapturedError()).toBe(err);
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("expires captures older than the 5s TTL", () => {
    const err = new Error("stale");
    dispatchError(err);
    vi.advanceTimersByTime(5_001);
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("still returns a capture at just under the TTL boundary", () => {
    const err = new Error("fresh enough");
    dispatchError(err);
    vi.advanceTimersByTime(4_999);
    expect(consumeLastCapturedError()).toBe(err);
  });
});
