import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { SPECIALISTS } from "../src/lib/agency/specialists.mjs";

const AGENT_IDS = new Set(Object.keys(SPECIALISTS));
const ALLOWED_VERDICTS = new Set(["PASS", "WARN", "FAIL", "BLOCKED", "UNKNOWN"]);
const DEFAULT_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_HEARTBEAT_EXTEND_SECONDS = 15 * 60;
const DEFAULT_HEARTBEAT_RETRIES = 3;
const DEFAULT_HEARTBEAT_RETRY_DELAY_MS = 10 * 1000;
const DEFAULT_HEARTBEAT_REQUEST_TIMEOUT_MS = 30 * 1000;

async function postAgencyAction(endpoint, headers, payload, fetchImpl) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof data?.error === "string" ? data.error : `AGENCY_API_${response.status}`;
    throw new Error(code);
  }
  return data;
}

function createDeferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function startHeartbeat({
  endpoint,
  headers,
  leaseToken,
  fetchImpl,
  intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  extendSeconds = DEFAULT_HEARTBEAT_EXTEND_SECONDS,
  maxRetries = DEFAULT_HEARTBEAT_RETRIES,
  retryDelayMs = DEFAULT_HEARTBEAT_RETRY_DELAY_MS,
  requestTimeoutMs = DEFAULT_HEARTBEAT_REQUEST_TIMEOUT_MS,
}) {
  const stopped = new AbortController();
  const leaseLost = createDeferred();
  let heartbeatInFlight = Promise.resolve();
  let terminalError = null;

  const wait = (ms) => new Promise((resolve) => {
    if (stopped.signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      stopped.signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      done();
    }
    stopped.signal.addEventListener("abort", abort, { once: true });
  });

  const loop = (async () => {
    while (!stopped.signal.aborted) {
      await wait(intervalMs);
      if (stopped.signal.aborted) break;

      let succeeded = false;
      for (let attempt = 1; attempt <= maxRetries && !stopped.signal.aborted; attempt += 1) {
        try {
          heartbeatInFlight = postAgencyAction(endpoint, headers, {
            action: "heartbeat",
            leaseToken,
            extendSeconds,
          }, (url, init) => fetchImpl(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) }));
          const response = await heartbeatInFlight;
          if (response?.ok !== true) {
            throw new Error("AGENCY_LEASE_LOST");
          }
          succeeded = true;
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : "AGENCY_HEARTBEAT_FAILED";
          if (message === "AGENCY_LEASE_LOST") {
            terminalError = new Error("AGENCY_LEASE_LOST");
            leaseLost.resolve(terminalError);
            return;
          }
          if (attempt < maxRetries && !stopped.signal.aborted) {
            await wait(retryDelayMs);
          }
        }
      }

      if (!succeeded && !stopped.signal.aborted) {
        terminalError = new Error("AGENCY_HEARTBEAT_RETRIES_EXHAUSTED");
        leaseLost.resolve(terminalError);
        return;
      }
    }
  })();

  return {
    leaseLost: leaseLost.promise,
    async stop() {
      stopped.abort();
      await heartbeatInFlight.catch(() => {});
      await loop;
    },
    get error() {
      return terminalError;
    },
  };
}

export async function runDurableWorker(options = {}) {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NUVA_AGENCY_API_BASE_URL;
  const githubToken = options.githubToken ?? process.env.GITHUB_TOKEN;
  const runId = options.runId ?? process.env.GITHUB_RUN_ID;
  const agentId = options.agentId ?? process.env.NUVA_AGENCY_AGENT_ID;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const executeSpecialist = options.executeSpecialist
    ?? (async (task, context) => SPECIALISTS[agentId].execute(task, context));

  if (typeof apiBaseUrl !== "string" || !apiBaseUrl.trim()) throw new Error("NUVA_AGENCY_API_BASE_URL_REQUIRED");
  const base = new URL(apiBaseUrl);
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    throw new Error("AGENCY_API_HTTPS_REQUIRED");
  }
  if (typeof githubToken !== "string" || githubToken.length < 10) throw new Error("GITHUB_TOKEN_REQUIRED");
  if (typeof runId !== "string" || !/^[0-9]+$/.test(runId)) throw new Error("GITHUB_RUN_ID_INVALID");
  if (typeof agentId !== "string" || !AGENT_IDS.has(agentId)) throw new Error("AGENCY_AGENT_ID_INVALID");
  if (typeof fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");

  const endpoint = new URL("/api/owner/agency-control", base).toString();
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    "Content-Type": "application/json",
    "x-agency-run-id": runId,
    "x-agency-agent-id": agentId,
  };

  const claimResponse = await postAgencyAction(endpoint, headers, {
    action: "claim_task",
    leaseSeconds: 1800,
  }, fetchImpl);
  const claimed = claimResponse?.claimed ?? null;
  if (!claimed) return { status: "idle", agentId };

  const task = claimed.task;
  const leaseToken = claimed.lease?.token;
  if (!task || typeof task.id !== "string" || typeof leaseToken !== "string" || leaseToken.length < 16) {
    throw new Error("AGENCY_CLAIM_RESPONSE_INVALID");
  }

  const taskInput = {
    ...task,
    agent_id: agentId,
    input_context: task.input_context && typeof task.input_context === "object" ? task.input_context : {},
  };

  const heartbeat = startHeartbeat({
    endpoint,
    headers,
    leaseToken,
    fetchImpl,
    intervalMs: options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    extendSeconds: options.heartbeatExtendSeconds ?? DEFAULT_HEARTBEAT_EXTEND_SECONDS,
    maxRetries: options.heartbeatMaxRetries ?? DEFAULT_HEARTBEAT_RETRIES,
    retryDelayMs: options.heartbeatRetryDelayMs ?? DEFAULT_HEARTBEAT_RETRY_DELAY_MS,
    requestTimeoutMs: options.heartbeatRequestTimeoutMs ?? DEFAULT_HEARTBEAT_REQUEST_TIMEOUT_MS,
  });

  let result;
  const executionController = new AbortController();
  let execution;
  try {
    execution = Promise.resolve().then(() => executeSpecialist(taskInput, { signal: executionController.signal })).catch((error) => ({
      specialist: agentId,
      taskId: task.id,
      result: "FAIL",
      evidence: [],
      errors: [error instanceof Error ? error.message.slice(0, 500) : "specialist_execution_failed"],
      durationMs: 0,
      timestamp: new Date().toISOString(),
    }));
    result = await Promise.race([execution, heartbeat.leaseLost.then((error) => {
      executionController.abort(error);
      throw error;
    })]);
  } catch (error) {
    executionController.abort(error);
    if (execution) await execution.catch(() => {});
    throw error;
  } finally {
    await heartbeat.stop();
  }

  if (heartbeat.error) throw heartbeat.error;

  const verdict = ALLOWED_VERDICTS.has(result?.result) ? result.result : "UNKNOWN";
  const taskStatus = verdict === "PASS" || verdict === "WARN"
    ? "completed"
    : verdict === "BLOCKED" || verdict === "UNKNOWN"
      ? "blocked"
      : "failed";
  const evidence = Array.isArray(result?.evidence)
    ? result.evidence.filter((item) => typeof item === "string").slice(0, 30).map((item) => item.slice(0, 1000))
    : [];
  const errors = Array.isArray(result?.errors)
    ? result.errors.filter((item) => typeof item === "string").slice(0, 20).map((item) => item.slice(0, 500))
    : [];
  const summary = evidence.join(" | ").slice(0, 4000);

  const finished = await postAgencyAction(endpoint, headers, {
    action: "finish_task",
    leaseToken,
    status: taskStatus,
    summary,
    result: {
      specialist: agentId,
      verdict,
      evidence,
      errors,
      durationMs: Number.isFinite(result?.durationMs) ? result.durationMs : null,
      timestamp: typeof result?.timestamp === "string" ? result.timestamp : new Date().toISOString(),
    },
  }, fetchImpl);

  if (finished?.ok !== true) throw new Error("AGENCY_TASK_FINISH_REJECTED");
  return { status: "executed", agentId, taskId: task.id, verdict, taskStatus };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  runDurableWorker()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({
        status: "failed",
        error: error instanceof Error ? error.message : "AGENCY_WORKER_FAILED",
      }));
      process.exitCode = 1;
    });
}
