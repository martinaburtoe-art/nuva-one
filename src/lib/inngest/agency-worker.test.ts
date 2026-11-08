import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INNGEST_AGENCY_AGENT_IDS,
  runInngestAgencyWorker,
  type AgencyRpcClient,
  type InngestStepRunner,
} from "./agency-worker";

function makeStep(): InngestStepRunner {
  return {
    run: async (_id: string, handler: () => Promise<unknown>) => await handler(),
  };
}

function makeDb(responses: Array<{ data: unknown; error: unknown }>) {
  const rpc = vi.fn(async () => responses.shift() ?? { data: null, error: null });
  return { rpc } as unknown as AgencyRpcClient & { rpc: ReturnType<typeof vi.fn> };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

const claim = {
  task: {
    id: "00000000-0000-4000-8000-000000000123",
    title: "Finance audit",
    agent_id: "finance",
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


  it("blocks the global queue unless general claims are explicitly enabled", async () => {
    vi.stubEnv("NUVA_INNGEST_AGENCY_ALLOW_GENERAL_CLAIM", "false");
    vi.stubEnv("NUVA_INNGEST_AGENCY_TEST_TASK_ID", "");
    const db = makeDb([]);
    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      db,
      executeSpecialist: vi.fn(),
    });
    expect(result).toEqual({ status: "blocked", reason: "general-claim-disabled", agentId: "finance" });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("returns idle when the atomic claim RPC finds no eligible task", async () => {
    const db = makeDb([{ data: null, error: null }]);
    const execute = vi.fn();

    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: execute,
    });

    expect(result).toEqual({ status: "idle", agentId: "finance" });
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith("agency_claim_task", {
      p_agent_id: "finance",
      p_lease_seconds: 1800,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("executes and finishes a claimed task with exact deployment provenance", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40));
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
      taskId: claim.task.id,
      db,
      executeSpecialist: execute,
    });

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      id: claim.task.id,
      agent_id: "finance",
      input_context: { scope: "lockfile" },
    }));
    expect(db.rpc).toHaveBeenNthCalledWith(1, "agency_claim_task_by_id", {
      p_agent_id: "finance",
      p_task_id: claim.task.id,
      p_lease_seconds: 1800,
    });
    expect(db.rpc).toHaveBeenNthCalledWith(2, "agency_finish_task", expect.objectContaining({
      p_lease_token: claim.lease.token,
      p_status: "completed",
      p_result: expect.objectContaining({
        engine: "inngest",
        specialist: "finance",
        sourceRevision: "a".repeat(40),
        sourceEnvironment: "production",
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


  it("rejects a task ID that differs from the requested scoped UUID", async () => {
    const db = makeDb([{ data: claim, error: null }]);
    const execute = vi.fn();
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      taskId: "00000000-0000-4000-8000-000000000124",
      db,
      executeSpecialist: execute,
    })).rejects.toThrow("AGENCY_CLAIM_TASK_SCOPE_MISMATCH");
    expect(execute).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects a claim returned for a different specialist", async () => {
    const mismatched = { ...claim, task: { ...claim.task, agent_id: "sales" } };
    const db = makeDb([{ data: mismatched, error: null }]);
    const execute = vi.fn();
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: execute,
    })).rejects.toThrow("AGENCY_CLAIM_AGENT_MISMATCH");
    expect(execute).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed lease bearer tokens before specialist execution", async () => {
    const malformed = { ...claim, lease: { token: "not-a-token" } };
    const db = makeDb([{ data: malformed, error: null }]);
    const execute = vi.fn();
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: execute,
    })).rejects.toThrow("AGENCY_CLAIM_RESPONSE_INVALID");
    expect(execute).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });


  it("does not execute a specialist when the atomic claim RPC fails", async () => {
    const db = makeDb([{ data: null, error: new Error("claim failed") }]);
    const execute = vi.fn();
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: execute,
    })).rejects.toThrow("claim failed");
    expect(execute).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("records specialist exceptions as failed durable tasks", async () => {
    const db = makeDb([
      { data: claim, error: null },
      { data: true, error: null },
    ]);
    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: vi.fn().mockRejectedValue(new Error("specialist crash")),
    });

    expect(result).toMatchObject({ status: "executed", taskStatus: "failed", verdict: "FAIL" });
    expect(db.rpc).toHaveBeenNthCalledWith(2, "agency_finish_task", expect.objectContaining({
      p_status: "failed",
      p_result: expect.objectContaining({ errors: ["specialist crash"] }),
    }));
  });

  it("never reports success when the database rejects task finalization", async () => {
    const db = makeDb([
      { data: claim, error: null },
      { data: false, error: null },
    ]);
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: vi.fn().mockResolvedValue({ result: "PASS", evidence: [], errors: [] }),
    })).rejects.toThrow("AGENCY_TASK_FINISH_REJECTED");
    expect(db.rpc).toHaveBeenCalledTimes(2);
  });

  it("propagates task finalization RPC errors for Inngest retry", async () => {
    const db = makeDb([
      { data: claim, error: null },
      { data: null, error: new Error("finish unavailable") },
    ]);
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: vi.fn().mockResolvedValue({ result: "PASS", evidence: [], errors: [] }),
    })).rejects.toThrow("finish unavailable");
    expect(db.rpc).toHaveBeenCalledTimes(2);
  });


  it("reuses the exact specialist result and finish payload after a transient finish rejection", async () => {
    const cache = new Map<string, unknown>();
    const step: InngestStepRunner = {
      run: async (id, handler) => {
        if (cache.has(id)) return cache.get(id);
        const value = await handler();
        cache.set(id, value);
        return value;
      },
    };
    const db = makeDb([
      { data: claim, error: null },
      { data: false, error: null },
      { data: true, error: null },
    ]);
    const execute = vi.fn().mockResolvedValue({
      result: "PASS",
      evidence: ["stable evidence"],
      errors: [],
    });
    await expect(runInngestAgencyWorker("finance", step, {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: execute,
    })).rejects.toThrow("AGENCY_TASK_FINISH_REJECTED");

    const rpcCalls = db.rpc.mock.calls as unknown as Array<[string, Record<string, unknown>]>;
    const firstFinish = rpcCalls[1][1];
    const result = await runInngestAgencyWorker("finance", step, {
      enabled: true,
      allowGeneralClaim: true,
      db,
      executeSpecialist: execute,
    });
    const secondFinish = rpcCalls[2][1];

    expect(result).toMatchObject({ status: "executed", verdict: "PASS" });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(secondFinish).toEqual(firstFinish);
    expect(typeof secondFinish.p_result.timestamp).toBe("string");
    expect(Number.isFinite(secondFinish.p_result.durationMs)).toBe(true);
  });

  it("maps a BLOCKED specialist result to a blocked durable task", async () => {
    const db = makeDb([
      { data: claim, error: null },
      { data: true, error: null },
    ]);
    const result = await runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      allowGeneralClaim: true,
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

  it("rejects malformed task-scoped certification IDs before touching Supabase", async () => {
    const db = makeDb([]);
    await expect(runInngestAgencyWorker("finance", makeStep(), {
      enabled: true,
      taskId: "not-a-uuid",
      db,
    })).rejects.toThrow("NUVA_INNGEST_TEST_TASK_ID_INVALID");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("fails closed on Vercel when the exact deployment source SHA is unavailable", async () => {
    const previousEnv = process.env.VERCEL_ENV;
    const previousSha = process.env.VERCEL_GIT_COMMIT_SHA;
    process.env.VERCEL_ENV = "preview";
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    const db = makeDb([]);
    try {
      await expect(runInngestAgencyWorker("finance", makeStep(), {
        enabled: true,
        db,
      })).rejects.toThrow("NUVA_INNGEST_SOURCE_REVISION_REQUIRED");
      expect(db.rpc).not.toHaveBeenCalled();
    } finally {
      if (previousEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previousEnv;
      if (previousSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
      else process.env.VERCEL_GIT_COMMIT_SHA = previousSha;
    }
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
