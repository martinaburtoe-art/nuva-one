export interface AgencySpecialistResult {
  result?: "PASS" | "WARN" | "FAIL" | "BLOCKED" | "UNKNOWN" | string;
  evidence?: unknown[];
  errors?: unknown[];
  durationMs?: number;
  timestamp?: string;
}

export type AgencySpecialist = (
  task: Record<string, unknown>,
) => Promise<AgencySpecialistResult>;

export const SPECIALISTS: Record<string, AgencySpecialist>;
export const SPECIALIST_IDS: readonly string[];
export const SPECIALIST_META: Record<string, unknown>;
