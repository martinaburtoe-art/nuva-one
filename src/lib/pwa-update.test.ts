import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyWaitingServiceWorkerUpdate,
  type PwaServiceWorkerHost,
} from "./pwa-update";

function createServiceWorker(waiting = true) {
  const target = new EventTarget();
  const postMessage = vi.fn();
  const serviceWorker = Object.assign(target, {
    getRegistration: vi.fn().mockResolvedValue({
      waiting: waiting ? { postMessage } : null,
    }),
  }) as unknown as PwaServiceWorkerHost;

  return { serviceWorker, target, postMessage };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("applyWaitingServiceWorkerUpdate", () => {
  it("reloads once after controllerchange and removes its listener", async () => {
    const { serviceWorker, target, postMessage } = createServiceWorker();
    const reload = vi.fn();
    const removeListener = vi.spyOn(serviceWorker, "removeEventListener");

    const pending = applyWaitingServiceWorkerUpdate({ serviceWorker, reload });
    await Promise.resolve();
    target.dispatchEvent(new Event("controllerchange"));

    expect(await pending).toBe("updated");
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));

    target.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("times out, releases the listener and leaves reload untouched when the worker never responds", async () => {
    vi.useFakeTimers();
    const { serviceWorker, target } = createServiceWorker();
    const reload = vi.fn();
    const removeListener = vi.spyOn(serviceWorker, "removeEventListener");

    const pending = applyWaitingServiceWorkerUpdate({
      serviceWorker,
      reload,
      timeoutMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await pending).toBe("timeout");
    expect(removeListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
    target.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("cleans up when the component aborts during unmount", async () => {
    const { serviceWorker, target } = createServiceWorker();
    const reload = vi.fn();
    const controller = new AbortController();
    const removeListener = vi.spyOn(serviceWorker, "removeEventListener");

    const pending = applyWaitingServiceWorkerUpdate({
      serviceWorker,
      reload,
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();

    expect(await pending).toBe("aborted");
    expect(removeListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
    target.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("returns no-update without registering a listener when no worker is waiting", async () => {
    const { serviceWorker } = createServiceWorker(false);
    const addListener = vi.spyOn(serviceWorker, "addEventListener");

    await expect(
      applyWaitingServiceWorkerUpdate({ serviceWorker, reload: vi.fn() }),
    ).resolves.toBe("no-update");
    expect(addListener).not.toHaveBeenCalled();
  });

  it("returns unavailable when service workers are unsupported", async () => {
    await expect(
      applyWaitingServiceWorkerUpdate({ serviceWorker: undefined, reload: vi.fn() }),
    ).resolves.toBe("unavailable");
  });

  it("removes the listener when posting SKIP_WAITING throws", async () => {
    const { serviceWorker } = createServiceWorker();
    const registration = await serviceWorker.getRegistration("/");
    registration!.waiting!.postMessage = () => {
      throw new Error("postMessage failed");
    };
    const removeListener = vi.spyOn(serviceWorker, "removeEventListener");

    await expect(
      applyWaitingServiceWorkerUpdate({ serviceWorker, reload: vi.fn() }),
    ).rejects.toThrow("postMessage failed");
    expect(removeListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
  });
});
