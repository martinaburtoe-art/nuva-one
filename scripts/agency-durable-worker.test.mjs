import { describe, expect, it, vi } from "vitest";
import { runDurableWorker } from "./agency-durable-worker.mjs";

const baseOptions = {
  apiBaseUrl: "https://nuva-one.vercel.app",
  githubToken: "ghs_test_token_123456789",
  runId: "123456789",
  agentId: "finance",
};

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function claimResponse(overrides = {}) {
  return jsonResponse({
    claimed: {
      task: { id: "task-1", title: "Finance", input_context: {} },
      lease: { token: "lease-token-1234567890" },
      ...overrides,
    },
  });
}

describe("agency durable worker", () => {
  it("returns idle and does not finish when the queue is empty", async () => {
    const actions = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      actions.push(body.action);
      if (body.action === "claim_task") return jsonResponse({ claimed: null });
      throw new Error("unexpected_action");
    });

    const result = await runDurableWorker({ ...baseOptions, fetchImpl });

    expect(result).toEqual({ status: "idle", agentId: "finance" });
    expect(actions).toEqual(["claim_task"]);
  });

  it("dispatches the registered specialist and persists its verdict", async () => {
    const actions = [];
    const finishPayloads = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      actions.push(body.action);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "finish_task") {
        finishPayloads.push(body);
        return jsonResponse({ ok: true });
      }
      throw new Error("unexpected_action");
    });

    const result = await runDurableWorker({ ...baseOptions, fetchImpl });

    expect(result.status).toBe("executed");
    expect(result.agentId).toBe("finance");
    expect(actions).toEqual(["claim_task", "finish_task"]);
    expect(finishPayloads).toHaveLength(1);
    expect(finishPayloads[0].result.specialist).toBe("finance");
    expect(["PASS", "WARN", "FAIL", "BLOCKED", "UNKNOWN"]).toContain(
      finishPayloads[0].result.verdict,
    );
  });

  it("persists FAIL when the specialist throws", async () => {
    const finishPayloads = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "finish_task") {
        finishPayloads.push(body);
        return jsonResponse({ ok: true });
      }
      throw new Error("unexpected_action");
    });

    const result = await runDurableWorker({
      ...baseOptions,
      fetchImpl,
      executeSpecialist: async () => {
        throw new Error("specialist_failed_for_test");
      },
    });

    expect(result.verdict).toBe("FAIL");
    expect(finishPayloads).toHaveLength(1);
    expect(finishPayloads[0].status).toBe("failed");
    expect(finishPayloads[0].result.errors).toContain("specialist_failed_for_test");
  });

  it("maps an unknown specialist verdict to UNKNOWN and blocks the task", async () => {
    const finishPayloads = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.action === "claim_task") return claimResponse();
      if (body.action === "finish_task") {
        finishPayloads.push(body);
        return jsonResponse({ ok: true });
      }
      throw new Error("unexpected_action");
    });

    const result = await runDurableWorker({
      ...baseOptions,
      fetchImpl,
      executeSpecialist: async () => ({ result: "NOT_A_VERDICT", evidence: [], errors: [] }),
    });

    expect(result.verdict).toBe("UNKNOWN");
    expect(result.taskStatus).toBe("blocked");
    expect(finishPayloads[0].status).toBe("blocked");
  });

  it("fails closed when the claim has no valid lease token", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      claimed: { task: { id: "task-1" }, lease: { token: "short" } },
    }));

    await expect(runDurableWorker({ ...baseOptions, fetchImpl }))
      .rejects.toThrow("AGENCY_CLAIM_RESPONSE_INVALID");
  });
});
