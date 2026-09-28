export type AgencyAutonomyLevel = "L0_OBSERVE" | "L1_RECOMMEND" | "L2_CONTROLLED_AUTOHEAL" | "L3_AUTONOMOUS_ENGINEERING" | "L4_STRATEGIC";

export type AgencyRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "PLANNED" | "EXECUTING" | "VERIFYING" | "RESOLVED" | "ESCALATED";

export type AgencyDepartment =
  | "sentinel" | "engineering" | "qa" | "security" | "data" | "devops"
  | "performance" | "finops" | "growth" | "compliance" | "ai-reliability";

export interface Evidence {
  id: string;
  kind: "log" | "metric" | "trace" | "test" | "screenshot" | "diff" | "query" | "github" | "deployment" | "manual";
  source: string;
  observedAt: string;
  summary: string;
  locator?: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface Finding {
  id: string;
  fingerprint: string;
  title: string;
  severity: FindingSeverity;
  department: AgencyDepartment;
  confidence: number;
  evidence: Evidence[];
  detectedAt: string;
  tenantSafe: boolean;
}

export interface Hypothesis {
  id: string;
  incidentId: string;
  statement: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  nextChecks: string[];
}

export interface Action {
  id: string;
  incidentId: string;
  agentId: string;
  description: string;
  risk: AgencyRisk;
  autonomyLevel: AgencyAutonomyLevel;
  reversible: boolean;
  requiresApproval: boolean;
  verificationPlan: string[];
  status: "PROPOSED" | "APPROVED" | "EXECUTED" | "ROLLED_BACK" | "REJECTED";
}

export interface Verification {
  id: string;
  actionId: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  observedAt: string;
}

export interface Incident {
  id: string;
  fingerprint: string;
  title: string;
  status: IncidentStatus;
  severity: FindingSeverity;
  findings: string[];
  hypotheses: string[];
  actions: string[];
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgencyAgentDefinition {
  id: string;
  name: string;
  department: AgencyDepartment;
  responsibilities: string[];
  capabilities: string[];
  defaultAutonomy: AgencyAutonomyLevel;
  allowedRisks: AgencyRisk[];
}
