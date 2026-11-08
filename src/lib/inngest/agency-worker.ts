import { createClient } from "@supabase/supabase-js";
import { SPECIALISTS } from "../agency/specialists.mjs";
import { getServerSupabaseEnv } from "../supabase-env.server";

export const INNGEST_AGENCY_AGENT_IDS = [
  "finance",
  "sales",
  "supply",
  "people",
  "growth",
  "orchestrator",
  "compliance",
  "security",
  "ux",
] as const;

export type InngestAgencyAgentId = (typeof INNGEST_AGENCY_AGENT_IDS)[number];

type RpcResult = { data: unknown; error: unknown };
export type AgencyRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

export type InngestStepRunner = {
  run: (id: string, handler: () => Promise<unknown>) => Promise<unknown>;
};

type SpecialistResult = {
  result?: string;
  evidence?: unknown[];
  errors?: unknown[];
  durationMs?: number;
  timestamp?: string;
};

type Specialist = (task: Record<string, unknown>) => Promise<SpecialistResult>;

type WorkerDependencies = {
  enabled?: boolean;
  /** Restricts this run to one exact task; used for production certification. */
  taskId?: string;
  db?: AgencyRpcClient;
  executeSpecialist?: Specialist;
};

const ALLOWED_VERDICTS = new Set(["PASS", "WARN", "FAIL", "BLOCKED", "UNKNOWN"]);
const specialistMap = SPECIALISTS as unknown as Record<string, Specialist>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createServiceRoleClient(): AgencyRpcClient {
  const { url, serviceRoleKey } = getServerSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("NUVA_INNGEST_SUPABASE_SERVICE_ROLE_REQUIRED");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }) as unknown as AgencyRpcClient;
}

function safeStrings(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

/**
 * Claims and executes exactly one durable task for a read-only specialist.
 * The database RPC remains the source of truth for atomic claims and leases.
 */
export async function runInngestAgencyWorker(
  agentId: string,
  step: InngestStepRunner,
  dependencies: WorkerDependencies = {},
) {
  if (!(INNGEST_AGENCY_AGENT_IDS as readonly string[]).includes(agentId)) {
    throw new Error("INNGEST_AGENCY_AGENT_NOT_ALLOWED");
  }

  const enabled = dependencies.enabled ?? process.env.NUVA_INNGEST_AGENCY_ENABLED === "true";
  if (!enabled) return { status: "disabled" as const, agentId };
  if (process.env.VERCEL_ENV && !/^[a-f0-9]{40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA ?? "")) {
    throw new Error("NUVA_INNGEST_SOURCE_REVISION_REQUIRED");
  }

  const db = dependencies.db ?? createServiceRoleClient();
  const scopedTaskId = dependencies.taskId ?? process.env.NUVA_INNGEST_AGENCY_TEST_TASK_ID;
  if (scopedTaskId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scopedTaskId)) {
    throw new Error("NUVA_INNGEST_TEST_TASK_ID_INVALID");
  }
  const executeSpecialist = dependencies.executeSpecialist ?? specialistMap[agentId];
  if (typeof executeSpecialist !== "function") {
    throw new Error("INNGEST_AGENCY_SPECIALIST_NOT_REGISTERED");
  }

  const claim = await step.run(`claim-${agentId}`, async () => {
    const { data, error } = scopedTaskId
      ? await db.rpc("agency_claim_task_by_id", {
          p_agent_id: agentId,
          p_task_id: scopedTaskId,
          p_lease_seconds: 1800,
        })
      : await db.rpc("agency_claim_task", {
          p_agent_id: agentId,
          p_lease_seconds: 1800,
        });
    if (error) throw error;
    return data;
  }) as unknown;

  if (claim === null) return { status: "idle" as const, agentId };
  if (!isRecord(claim) || !isRecord(claim.task) || !isRecord(claim.lease)) {
    throw new Error("AGENCY_CLAIM_RESPONSE_INVALID");
  }

  const task = claim.task;
  const taskId = task.id;
  const leaseToken = claim.lease.token;
  if (typeof taskId !== "string" || typeof leaseToken !== "string" || !/^[a-f0-9]{32,64}$/i.test(leaseToken)) {
    throw new Error("AGENCY_CLAIM_RESPONSE_INVALID");
  }
  if (scopedTaskId && taskId.toLowerCase() !== scopedTaskId.toLowerCase()) {
    throw new Error("AGENCY_CLAIM_TASK_SCOPE_MISMATCH");
  }
  if (task.agent_id !== agentId) {
    throw new Error("AGENCY_CLAIM_AGENT_MISMATCH");
  }

  const taskInput = {
    ...task,
    agent_id: agentId,
    input_context: isRecord(task.input_context) ? task.input_context : {},
  };

  const specialistResult = await step.run(`execute-${taskId}`, async () => {
    try {
      return await executeSpecialist(taskInput);
    } catch (error) {
      return {
        result: "FAIL",
        evidence: [],
        errors: [error instanceof Error ? error.message.slice(0, 500) : "specialist_execution_failed"],
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }) as SpecialistResult;

  const verdict = ALLOWED_VERDICTS.has(specialistResult?.result ?? "")
    ? specialistResult.result!
    : "UNKNOWN";
  const taskStatus = verdict === "PASS" || verdict === "WARN"
    ? "completed"
    : verdict === "BLOCKED" || verdict === "UNKNOWN"
      ? "blocked"
      : "failed";
  const evidence = safeStrings(specialistResult?.evidence, 30, 1000);
  const errors = safeStrings(specialistResult?.errors, 20, 500);
  const summary = evidence.join(" | ").slice(0, 4000);

  const finished = await step.run(`finish-${taskId}`, async () => {
    const { data, error } = await db.rpc("agency_finish_task", {
      p_lease_token: leaseToken,
      p_status: taskStatus,
      p_summary: summary,
      p_result: {
        engine: "inngest",
        specialist: agentId,
        sourceRevision: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        sourceEnvironment: process.env.VERCEL_ENV ?? "unknown",
        verdict,
        evidence,
        errors,
        durationMs: Number.isFinite(specialistResult?.durationMs) ? specialistResult.durationMs : null,
        timestamp: typeof specialistResult?.timestamp === "string"
          ? specialistResult.timestamp
          : new Date().toISOString(),
      },
    });
    if (error) throw error;
    return data;
  }) as unknown;

  if (finished !== true) throw new Error("AGENCY_TASK_FINISH_REJECTED");

  return { status: "executed" as const, agentId, taskId, verdict, taskStatus };
}
