export type PwaUpdateResult = "updated" | "no-update" | "timeout" | "unavailable" | "aborted";

type WaitingServiceWorker = {
  postMessage: (message: { type: "SKIP_WAITING" }) => void;
};

export interface PwaServiceWorkerHost {
  getRegistration: (scope?: string) => Promise<{ waiting: WaitingServiceWorker | null } | undefined>;
  addEventListener: (
    type: "controllerchange",
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener: (type: "controllerchange", listener: EventListener) => void;
}

export async function applyWaitingServiceWorkerUpdate(input: {
  serviceWorker?: PwaServiceWorkerHost | null;
  reload: () => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<PwaUpdateResult> {
  const { serviceWorker, reload, signal, timeoutMs = 15_000 } = input;
  if (!serviceWorker) return "unavailable";
  if (signal?.aborted) return "aborted";

  const registration = await serviceWorker.getRegistration("/");
  if (signal?.aborted) return "aborted";
  const worker = registration?.waiting;
  if (!worker) return "no-update";

  return new Promise<PwaUpdateResult>((resolve, reject) => {
    let settled = false;
    const timeout: { handle?: ReturnType<typeof setTimeout> } = {};

    const cleanup = () => {
      serviceWorker.removeEventListener("controllerchange", onControllerChange);
      signal?.removeEventListener("abort", onAbort);
      if (timeout.handle !== undefined) clearTimeout(timeout.handle);
    };

    const finish = (result: PwaUpdateResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onControllerChange: EventListener = () => {
      if (settled) return;
      try {
        reload();
        finish("updated");
      } catch (error) {
        fail(error);
      }
    };
    const onAbort = () => finish("aborted");

    serviceWorker.addEventListener("controllerchange", onControllerChange);
    signal?.addEventListener("abort", onAbort, { once: true });
    timeout.handle = setTimeout(() => finish("timeout"), Math.max(0, timeoutMs));

    if (signal?.aborted) {
      onAbort();
      return;
    }

    try {
      worker.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      fail(error);
    }
  });
}
