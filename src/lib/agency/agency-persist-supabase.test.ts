import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, calls } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  calls: [] as Array<Record<string, any>>,
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

function makeClient() {
  return {
    from: (table: string) => ({
      upsert: async (payload: Record<string, any>, options?: Record<string, any>) => {
        calls.push({ table, method: "upsert", payload, options });
        return { error: null };
      },
      insert: async (payload: Record<string, any>) => {
        calls.push({ table, method: "insert", payload });
        return { error: null };
      },
      select: () => ({
        limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      update: (payload: Record<string, any>) => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: { id: payload.id }, error: null }),
          }),
        }),
      }),
    }),
  };
}

describe("agency-persist-supabase", () => {
  beforeEach(() => {
    vi.resetModules();
    calls.length = 0;
    process.env.SUPABASE_URL = "https://unit-test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-only-not-a-real-secret";
    createClientMock.mockReturnValue(makeClient());
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("maps backlog IDs to deterministic UUIDs and upserts mission before task/event", async () => {
    const { persistExecution } = await import("../../../scripts/agency-persist-supabase.mjs");
    const result = await persistExecution({
      missionId: "agency-batch-unit-1",
      taskId: "T-14",
      title: "Validar persistencia",
      objective: "Demostrar que la ejecución se registra de forma durable",
      agentId: "qa",
      status: "completed",
      result: "PASS",
      summary: "Vitest real",
      output: { durationMs: 12 },
      attemptCount: 2,
      maxAttempts: 3,
    });

    expect(result.persisted).toBe(true);
    if (!result.persisted) throw new Error(result.reason);
    expect(result.missionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.taskId).toMatch(/^[0-9a-f-]{36}$/i);
    const mission = calls.find((call) => call.table === "agency_missions" && call.method === "upsert")?.payload;
    const task = calls.find((call) => call.table === "agency_tasks" && call.method === "upsert")?.payload;
    const event = calls.find((call) => call.table === "agency_events" && call.method === "insert")?.payload;
    expect(mission.id).toBe(result.missionId);
    expect(task.id).toBe(result.taskId);
    expect(task.mission_id).toBe(result.missionId);
    expect(task.input_context.backlog_task_id).toBe("T-14");
    expect(task.attempt_count).toBe(2);
    expect(event.mission_id).toBe(result.missionId);
    expect(event.task_id).toBe(result.taskId);
  });

  it("reutiliza el mismo UUID lógico al reintentar la misma tarea", async () => {
    const { persistExecution } = await import("../../../scripts/agency-persist-supabase.mjs");
    const input = {
      missionId: "agency-batch-unit-2",
      taskId: "T-20",
      title: "Reintento",
      objective: "Idempotencia",
      agentId: "qa",
      status: "failed" as const,
      result: "FAIL",
      summary: "Intento 1",
    };
    const first = await persistExecution(input);
    const second = await persistExecution({ ...input, summary: "Intento 2", attemptCount: 2 });
    if (!first.persisted) throw new Error(first.reason);
    if (!second.persisted) throw new Error(second.reason);
    expect(first.missionId).toBe(second.missionId);
    expect(first.taskId).toBe(second.taskId);
  });
});
