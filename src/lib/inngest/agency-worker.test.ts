import { describe, expect, it, vi } from "vitest";
import {
  INNGEST_AGENCY_AGENT_IDS,
  runInngestAgencyWorker,
  type AgencyRpcClient,
  type InngestStepRunner,
} from "./agency-worker";

function makeStep(): InngestStepRunner {
  return {
    run: async <T>(_id: string, handler: () => T | Promise<T>) => await handler(),
  };
}

function makeDb(responses: Array<{ data: unknown; error: unknown }>) {
  const rpc = vi.fn(async () => responses.shift() ?? { data: null, error: null });
  return { rpc } as unknown as AgencyRpcClient & { rpc: ReturnType<typeof vi.fn> };
}

const claim = {
  task: {
    id: "00000000-0000-4000-8000-000000000123",
    title: "Finance audit",
    input_context: { scope: "lockfile" },
  },
  lease: { token: "0123456789abcdef0123456789abcdef" },
};

describe("Inngest Agency worker", () => {
  it("keeps workers disabled unless explicitly enabled", async () => {
    const db = makeDb([]);
    const execute = vi.fn();
    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: false,
      db,
      executeSpecialist: execute,
    });

    expect(result).toEqual({ status: "disabled", agentId: "finance" });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns idle when the atomic claim RPC finds no eligible task", async () => {
    const db = makeDb([{ data: null, error: null }]);
    const execute = vi.fn();

    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      db,
      executeSpecialist: execute,
    });

    expect(result).toEqual({ status: "idle", agentId: "finance" });
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it("executes and finishes a claimed task using the service-role RPC contract", async () => {
    const db = makeDb([
      { data: claim, error: null },
      { data: true, error: null },
    ]);
    const execute = vi.fn().mockResolvedValue({
      result: "PASS",
      evidence: ["package-lock.json leído"],
      errors: [],
      durationMs: 12,
      timestamp: "2026-11-07T23:00:00.000Z",
    });

    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      db,
      executeSpecialist: execute,
    });

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      id: claim.task.id,
      agent_id: "finance",
      input_context: { scope: "lockfile" },
    }));
    expect(db.rpc).toHaveBeenNthCalledWith(1, "agency_claim_task", {
      p_agent_id: "finance",
      p_lease_seconds: 1800,
    });
    expect(db.rpc).toHaveBeenNthCalledWith(2, "agency_finish_task", expect.objectContaining({
      p_lease_token: claim.lease.token,
      p_status: "completed",
      p_result: expect.objectContaining({
        engine: "inngest",
        specialist: "finance",
        verdict: "PASS",
      }),
    }));
    expect(result).toEqual({
      status: "executed",
      agentId: "finance",
      taskId: claim.task.id,
      verdict: "PASS",
      taskStatus: "completed",
    });
  });

  it("maps a BLOCKED specialist result to a blocked durable task", async () => {
    const db = makeDb([
      { data: claim, error: null },
      { data: true, error: null },
    ]);
    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      db,
      executeSpecialist: vi.fn().mockResolvedValue({
        result: "BLOCKED",
        evidence: ["requiere aprobación"],
        errors: [],
      }),
    });

    expect(result).toMatchObject({ status: "executed", taskStatus: "blocked", verdict: "BLOCKED" });
    expect(db.rpc).toHaveBeenNthCalledWith(2, "agency_finish_task", expect.objectContaining({
      p_status: "blocked",
    }));
  });

  it("rejects specialists that depend on local shell or GitHub Actions execution", async () => {
    const db = makeDb([]);
    await expect(runInngestAgencyWorker("qa", makeStep(), {
      enabled: true,
      db,
    })).rejects.toThrow("INNGEST_AGENCY_AGENT_NOT_ALLOWED");
    expect(db.rpc).not.toHaveBeenCalled();
    expect(INNGEST_AGENCY_AGENT_IDS).not.toContain("qa");
    expect(INNGEST_AGENCY_AGENT_IDS).not.toContain("release");
    expect(INNGEST_AGENCY_AGENT_IDS).not.toContain("constructor");
  });
});
