import { describe, expect, it, vi } from "vitest";
import { runDurableWorker } from "../../../scripts/agency-durable-worker.mjs";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const baseOptions = {
  apiBaseUrl: "https://nuva-one.test",
  githubToken: "test-github-token-not-a-secret",
  runId: "123456",
  agentId: "qa",
};

describe("durable agency worker", () => {
  it("returns idle without invoking a specialist when there is no claim", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ claimed: null }));
    const executeSpecialist = vi.fn();
    const result = await runDurableWorker({ ...baseOptions, fetchImpl, executeSpecialist });

    expect(result).toEqual({ status: "idle", agentId: "qa" });
    expect(executeSpecialist).not.toHaveBeenCalled();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ action: "claim_task", leaseSeconds: 1800 });
  });

  it("executes the claimed specialist and releases its lease with a structured result", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        claimed: {
          task: { id: "00000000-0000-4000-8000-000000000123", title: "QA task", input_context: { target: "src/lib/example.test.ts" } },
          lease: { token: "0123456789abcdef0123456789abcdef" },
        },
      }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const executeSpecialist = vi.fn().mockResolvedValue({
      specialist: "qa",
      taskId: "00000000-0000-4000-8000-000000000123",
      result: "PASS",
      evidence: ["1/1 tests passed"],
      errors: [],
      durationMs: 18,
      timestamp: "2026-10-30T11:00:00.000Z",
    });

    const result = await runDurableWorker({ ...baseOptions, fetchImpl, executeSpecialist });
    const finishBody = JSON.parse(fetchImpl.mock.calls[1][1].body);

    expect(executeSpecialist).toHaveBeenCalledWith(expect.objectContaining({
      id: "00000000-0000-4000-8000-000000000123",
      agent_id: "qa",
      input_context: { target: "src/lib/example.test.ts" },
    }));
    expect(finishBody).toMatchObject({
      action: "finish_task",
      leaseToken: "0123456789abcdef0123456789abcdef",
      status: "completed",
      result: { verdict: "PASS", specialist: "qa" },
    });
    expect(result).toMatchObject({ status: "executed", agentId: "qa", verdict: "PASS", taskStatus: "completed" });
  });

  it("maps blocked specialist results to a blocked durable task", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        claimed: {
          task: { id: "00000000-0000-4000-8000-000000000124", title: "Blocked task" },
          lease: { token: "0123456789abcdef0123456789abcdef" },
        },
      }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const executeSpecialist = vi.fn().mockResolvedValue({ result: "BLOCKED", evidence: ["requires approval"], errors: [] });

    const result = await runDurableWorker({ ...baseOptions, fetchImpl, executeSpecialist });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).status).toBe("blocked");
    expect(result.status).toBe("executed");
    if (result.status !== "executed") throw new Error("worker did not execute the claimed task");
    expect(result.taskStatus).toBe("blocked");
  });

  it("rejects invalid agent IDs before making an API request", async () => {
    const fetchImpl = vi.fn();
    await expect(runDurableWorker({ ...baseOptions, agentId: "root", fetchImpl })).rejects.toThrow("AGENCY_AGENT_ID_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
