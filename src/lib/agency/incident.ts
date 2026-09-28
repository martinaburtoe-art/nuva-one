import type {
  Evidence,
  Finding,
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

const severityByStatus = {
  healthy: "LOW",
  skipped: "LOW",
  warning: "MEDIUM",
  critical: "CRITICAL",
} as const;

export function buildEvidence(signal: SentinelSignal): Evidence {
  return {
    type: "telemetry",
    source: signal.source,
    capturedAt: signal.observedAt,
    summary: signal.detail ?? signal.name,
    data: signal,
  };
}

export function buildFinding(signal: SentinelSignal): Finding {
  return {
    id: `finding-${signal.fingerprint}`,
    severity: severityByStatus[signal.status],
    title: `${signal.source}: ${signal.name}`,
    description: signal.detail ?? "Sentinel signal requires investigation.",
    evidence: [buildEvidence(signal)],
  };
}

export function buildHypothesis(signal: SentinelSignal): Hypothesis {
  const detail = signal.detail ?? "";

  if (signal.source === "github" && signal.name === "actions_health") {
    return {
      statement: "A recent CI workflow may be failing or timing out.",
      confidence: signal.status === "critical" ? 0.8 : 0.55,
      evidenceIds: [`finding-${signal.fingerprint}`],
      nextChecks: ["Inspect the latest failed workflow job and its logs."],
    };
  }

  if (signal.source === "vercel" && signal.name === "production_http") {
    return {
      statement: "The production surface may be unavailable or returning an unexpected status.",
      confidence: signal.status === "critical" ? 0.95 : 0.6,
      evidenceIds: [`finding-${signal.fingerprint}`],
      nextChecks: [
        "Check the latest production deployment.",
        "Inspect runtime logs for correlated errors.",
      ],
    };
  }

  if (signal.source === "supabase" && signal.name === "rest_health") {
    return {
      statement: "The Supabase REST surface may be degraded or unreachable.",
      confidence: signal.status === "critical" ? 0.9 : 0.5,
      evidenceIds: [`finding-${signal.fingerprint}`],
      nextChecks: ["Inspect Supabase project health and recent logs."],
    };
  }

  return {
    statement: `The signal ${signal.name} from ${signal.source} requires investigation.`,
    confidence: signal.status === "critical" ? 0.7 : 0.4,
    evidenceIds: [`finding-${signal.fingerprint}`],
    nextChecks: [detail || "Collect a second independent signal before acting."],
  };
}

export function buildVerification(signal: SentinelSignal): Verification {
  return {
    id: `verification-${signal.fingerprint}`,
    required: signal.status === "critical" || signal.status === "warning",
    checks: [
      {
        name: `repeat:${signal.source}/${signal.name}`,
        expected: "healthy",
      },
    ],
  };
}

export function buildIncident(signal: SentinelSignal): Incident | null {
  if (signal.status !== "critical" && signal.status !== "warning") {
    return null;
  }

  const finding = buildFinding(signal);
  const hypothesis = buildHypothesis(signal);
  const verification = buildVerification(signal);

  return {
    id: `incident-${signal.fingerprint}`,
    fingerprint: signal.fingerprint,
    severity: severityByStatus[signal.status],
    status: "open",
    summary: finding.title,
    findings: [finding],
    hypotheses: [hypothesis],
    verifications: [verification],
    openedAt: signal.observedAt,
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
    existing.verifications.push(...incident.verifications);
  }

  return [...incidents.values()];
}
