import type {
  Evidence,
  Finding,
  FindingSeverity,
  Hypothesis,
  Incident,
  Verification,
} from "./types";

export type SentinelSignal = {
  source: string;
  name: string;
  status: "healthy" | "warning" | "critical" | "skipped";
  fingerprint: string;
  observedAt: string;
  detail?: string;
  [key: string]: unknown;
};

const severityByStatus: Record<SentinelSignal["status"], FindingSeverity> = {
  healthy: "LOW",
  skipped: "LOW",
  warning: "MEDIUM",
  critical: "CRITICAL",
};

export function buildEvidence(signal: SentinelSignal): Evidence {
  return {
    id: `evidence-${signal.fingerprint}`,
    kind: signal.source === "github" ? "github" : "log",
    source: signal.source,
    observedAt: signal.observedAt,
    summary: signal.detail ?? signal.name,
    metadata: signal,
  };
}

export function buildFinding(signal: SentinelSignal): Finding {
  return {
    id: `finding-${signal.fingerprint}`,
    fingerprint: signal.fingerprint,
    severity: severityByStatus[signal.status],
    title: `${signal.source}: ${signal.name}`,
    confidence: signal.status === "critical" ? 0.9 : 0.65,
    evidence: [buildEvidence(signal)],
    department: signal.source === "github" ? "engineering" : "sentinel",
    detectedAt: signal.observedAt,
    tenantSafe: true,
  };
}

export function buildHypothesis(
  signal: SentinelSignal,
  incidentId: string,
): Hypothesis {
  const findingId = `finding-${signal.fingerprint}`;

  if (signal.source === "github" && signal.name === "actions_health") {
    return {
      id: `hypothesis-${signal.fingerprint}`,
      incidentId,
      statement: "A recent CI workflow may be failing or timing out.",
      confidence: signal.status === "critical" ? 0.8 : 0.55,
      supportingEvidence: [findingId],
      contradictingEvidence: [],
      nextChecks: ["Inspect the latest failed workflow job and its logs."],
    };
  }

  if (signal.source === "vercel" && signal.name === "production_http") {
    return {
      id: `hypothesis-${signal.fingerprint}`,
      incidentId,
      statement: "The production surface may be unavailable or returning an unexpected status.",
      confidence: signal.status === "critical" ? 0.95 : 0.6,
      supportingEvidence: [findingId],
      contradictingEvidence: [],
      nextChecks: [
        "Check the latest production deployment.",
        "Inspect runtime logs for correlated errors.",
      ],
    };
  }

  if (signal.source === "supabase" && signal.name === "rest_health") {
    return {
      id: `hypothesis-${signal.fingerprint}`,
      incidentId,
      statement: "The Supabase REST surface may be degraded or unreachable.",
      confidence: signal.status === "critical" ? 0.9 : 0.5,
      supportingEvidence: [findingId],
      contradictingEvidence: [],
      nextChecks: ["Inspect Supabase project health and recent logs."],
    };
  }

  return {
    id: `hypothesis-${signal.fingerprint}`,
    incidentId,
    statement: `The signal ${signal.name} from ${signal.source} requires investigation.`,
    confidence: signal.status === "critical" ? 0.7 : 0.4,
    supportingEvidence: [findingId],
    contradictingEvidence: [],
    nextChecks: [signal.detail || "Collect a second independent signal before acting."],
  };
}

export function buildVerification(
  signal: SentinelSignal,
  incidentId: string,
): Verification {
  return {
    id: `verification-${signal.fingerprint}`,
    actionId: incidentId,
    passed: false,
    checks: [
      {
        name: `repeat:${signal.source}/${signal.name}`,
        passed: false,
        detail: "Awaiting deterministic re-check.",
      },
    ],
    observedAt: signal.observedAt,
  };
}

export function buildIncident(signal: SentinelSignal): Incident | null {
  if (signal.status !== "critical" && signal.status !== "warning") {
    return null;
  }

  const incidentId = `incident-${signal.fingerprint}`;
  const finding = buildFinding(signal);
  const hypothesis = buildHypothesis(signal, incidentId);
  buildVerification(signal, incidentId);

  return {
    id: incidentId,
    fingerprint: signal.fingerprint,
    title: finding.title,
    status: "OPEN",
    severity: severityByStatus[signal.status],
    findings: [finding.id],
    hypotheses: [hypothesis.id],
    actions: [],
    evidence: finding.evidence.map((item) => item.id),
    createdAt: signal.observedAt,
    updatedAt: signal.observedAt,
  };
}

export function correlateSignals(signals: SentinelSignal[]): Incident[] {
  const incidents = new Map<string, Incident>();

  for (const signal of signals) {
    const incident = buildIncident(signal);
    if (!incident) continue;

    const existing = incidents.get(incident.fingerprint);
    if (!existing) {
      incidents.set(incident.fingerprint, incident);
      continue;
    }

    existing.findings.push(...incident.findings);
    existing.hypotheses.push(...incident.hypotheses);
    existing.evidence.push(...incident.evidence);
    existing.updatedAt = signal.observedAt;
  }

  return [...incidents.values()];
}
