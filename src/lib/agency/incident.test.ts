import { describe, expect, it } from "vitest";
import {
  buildFinding,
  buildIncident,
  buildVerification,
  correlateSignals,
} from "./incident";

const signal = {
  source: "vercel",
  name: "production_http",
  status: "critical" as const,
  fingerprint: "abc123",
  observedAt: "2026-09-28T03:00:00.000Z",
  detail: "Production returned HTTP 500",
};

describe("agency incident engine", () => {
  it("turns a critical sentinel signal into an incident", () => {
    const incident = buildIncident(signal);

    expect(incident?.severity).toBe("CRITICAL");
    expect(incident?.status).toBe("OPEN");
    expect(incident?.fingerprint).toBe("abc123");
    expect(incident?.findings).toHaveLength(1);
  });

  it("ignores healthy signals", () => {
    expect(buildIncident({ ...signal, status: "healthy" })).toBeNull();
  });

  it("preserves evidence in findings", () => {
    const finding = buildFinding(signal);

    expect(finding.evidence[0]?.kind).toBe("log");
    expect(finding.evidence[0]?.source).toBe("vercel");
  });

  it("creates a deterministic verification record", () => {
    const verification = buildVerification(signal, "incident-abc123");

    expect(verification.actionId).toBe("incident-abc123");
    expect(verification.passed).toBe(false);
    expect(verification.checks[0]?.passed).toBe(false);
  });

  it("deduplicates repeated fingerprints", () => {
    const incidents = correlateSignals([
      signal,
      { ...signal, detail: "same fingerprint" },
    ]);

    expect(incidents).toHaveLength(1);
    expect(incidents[0]?.findings).toHaveLength(2);
  });
});
