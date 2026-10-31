export type DurableAgencyWorkerTask = {
  id: string;
  title?: string;
  [key: string]: unknown;
};

export type DurableAgencyWorkerResult =
  | { status: "idle"; agentId: string }
  | {
      status: "executed";
      agentId: string;
      taskId: string;
      verdict: "PASS" | "WARN" | "FAIL" | "BLOCKED" | "UNKNOWN";
      taskStatus: "completed" | "failed" | "blocked";
    };

export type DurableAgencyWorkerOptions = {
  apiBaseUrl?: string;
  githubToken?: string;
  runId?: string;
  agentId?: string;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;
  executeSpecialist?: (task: DurableAgencyWorkerTask) => Promise<{
    result: "PASS" | "WARN" | "FAIL" | "BLOCKED" | "UNKNOWN";
    evidence?: string[];
    errors?: string[];
    durationMs?: number;
    timestamp?: string;
  }>;
};

export function runDurableWorker(
  options?: DurableAgencyWorkerOptions,
): Promise<DurableAgencyWorkerResult>;
