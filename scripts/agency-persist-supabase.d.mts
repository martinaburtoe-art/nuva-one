export type AgencyPersistResult =
  | { persisted: true; missionId: string; taskId?: string; status?: string }
  | { persisted: false; reason: string };

export interface PersistExecutionInput {
  missionId: string;
  taskId: string;
  title: string;
  objective: string;
  agentId: string;
  status: "completed" | "failed";
  result: string;
  summary?: string;
  output?: Record<string, unknown>;
  attemptCount?: number;
  maxAttempts?: number;
  inputContext?: Record<string, unknown>;
}

export declare const available: boolean;
export declare const client: unknown;
export declare function stableUuid(namespace: string, value: unknown): string;
export declare function persistCycle(input: {
  missionId?: string;
  title: string;
  objective: string;
  agentId: string;
  result: string;
  evidence?: string[];
  verdicts?: unknown[];
}): Promise<AgencyPersistResult>;
export declare function persistExecution(input: PersistExecutionInput): Promise<AgencyPersistResult>;
export declare function finalizeMission(input: {
  missionId: string;
  status: "queued" | "running" | "completed" | "failed" | "paused";
  summary?: string;
}): Promise<AgencyPersistResult>;
export declare function checkAvailability(): Promise<{ available: boolean; reason: string | null }>;
