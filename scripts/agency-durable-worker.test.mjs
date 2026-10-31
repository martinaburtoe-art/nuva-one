import { describe, expect, it, vi } from "vitest";
import { runDurableWorker } from "./agency-durable-worker.mjs";

const baseOptions = {
  apiBaseUrl: "https://nuva-one.vercel.app",
  githubToken: "ghs_test_token_123456789",
  runId: "123456789",
  agentId: "qa",
  heartbeatIntervalMs: 5,
  heartbeatRetryDelayMs: 2,
  heartbeatMaxRetries: 2,
};

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function claimResponse() {
  return jsonResponse({
    claimed: {
      task: { id: "task-1", title: "QA", input_context: {} },
      lease: { token: "lease-token-1234567890" },
    },
  });
}

describe("agency durable worker heartbeat", () => {
  it("renews the lease while the specialist runs and finishes once", async () => {
    const actions = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      actions.push(body.action);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "heartbeat") return jsonResponse({ ok: true });
      if (body.action === "finish_task") return jsonResponse({ ok: true });
      throw new Error("unexpected_action");
    });

    const result = await runDurableWorker({
      ...baseOptions,
      fetchImpl,
      executeSpecialist: async () => {
        await new Promise((resolve) => setTimeout(resolve, 24));
        return { result: "PASS", evidence: ["qa passed"], errors: [] };
      },
    });

    expect(result.status).toBe("executed");
    expect(actions.filter((action) => action === "heartbeat").length).toBeGreaterThan(0);
    expect(actions.filter((action) => action === "finish_task")).toHaveLength(1);
  });

  it("does not finish a task after the server reports that its lease was lost", async () => {
    const actions = [];
    let specialistSignal;
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      actions.push(body.action);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "heartbeat") return jsonResponse({ ok: false });
      if (body.action === "finish_task") return jsonResponse({ ok: true });
      throw new Error("unexpected_action");
    });

    await expect(runDurableWorker({
      ...baseOptions,
      fetchImpl,
      executeSpecialist: async (_task, { signal }) => {
        specialistSignal = signal;
        await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
        return { result: "PASS", evidence: [], errors: [] };
      },
    })).rejects.toThrow("AGENCY_LEASE_LOST");

    expect(specialistSignal?.aborted).toBe(true);
    expect(actions).not.toContain("finish_task");
  });

  it("retries a transient heartbeat failure and continues when renewal succeeds", async () => {
    const actions = [];
    let heartbeatCalls = 0;
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      actions.push(body.action);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "heartbeat") {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) return jsonResponse({ error: "temporary" }, 503);
        return jsonResponse({ ok: true });
      }
      if (body.action === "finish_task") return jsonResponse({ ok: true });
      throw new Error("unexpected_action");
    });

    const result = await runDurableWorker({
      ...baseOptions,
      fetchImpl,
      executeSpecialist: async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return { result: "WARN", evidence: ["warning recorded"], errors: [] };
      },
    });

    expect(result.status).toBe("executed");
    expect(heartbeatCalls).toBeGreaterThanOrEqual(2);
    expect(actions.filter((action) => action === "finish_task")).toHaveLength(1);
  });

  it("fails closed when heartbeat retries are exhausted and never finishes", async () => {
    const actions = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      actions.push(body.action);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "heartbeat") return jsonResponse({ error: "unavailable" }, 503);
      if (body.action === "finish_task") return jsonResponse({ ok: true });
      throw new Error("unexpected_action");
    });

    await expect(runDurableWorker({
      ...baseOptions,
      fetchImpl,
      executeSpecialist: async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { result: "PASS", evidence: [], errors: [] };
      },
    })).rejects.toThrow("AGENCY_HEARTBEAT_RETRIES_EXHAUSTED");

    expect(actions).not.toContain("finish_task");
  });
});
