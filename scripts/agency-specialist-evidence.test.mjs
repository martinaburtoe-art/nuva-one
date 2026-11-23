import { describe, expect, it } from "vitest";
import {
  classifyReleaseResult,
  classifySecurityResult,
  classifyPeopleScanResult,
  classifySentinelResult,
  SPECIALISTS,
} from "../src/lib/agency/specialists.mjs";

const task = (id) => ({ id: `evidence-${id}`, input_context: {} });

describe("Nüva Agency specialist evidence integrity", () => {
  it("Sentinel returns UNKNOWN when logs are missing, empty, malformed or unreadable", () => {
    expect(classifySentinelResult({
      logsAvailable: false,
      validLogFiles: 0,
      invalidLogFiles: 0,
      nonPassResults: 0,
      paused: false,
      pauseStateKnown: true,
    })).toBe("UNKNOWN");

    expect(classifySentinelResult({
      logsAvailable: true,
      validLogFiles: 0,
      invalidLogFiles: 0,
      nonPassResults: 0,
      paused: false,
      pauseStateKnown: true,
    })).toBe("UNKNOWN");

    expect(classifySentinelResult({
      logsAvailable: true,
      validLogFiles: 2,
      invalidLogFiles: 1,
      nonPassResults: 0,
      paused: false,
      pauseStateKnown: true,
    })).toBe("UNKNOWN");

    expect(classifySentinelResult({
      logsAvailable: true,
      validLogFiles: 1,
      invalidLogFiles: 0,
      nonPassResults: 0,
      paused: false,
      pauseStateKnown: false,
    })).toBe("UNKNOWN");
  });

  it("Sentinel warns on non-PASS outcomes or emergency pause and passes only on complete clean evidence", () => {
    const clean = {
      logsAvailable: true,
      validLogFiles: 3,
      invalidLogFiles: 0,
      nonPassResults: 0,
      paused: false,
      pauseStateKnown: true,
    };
    expect(classifySentinelResult(clean)).toBe("PASS");
    expect(classifySentinelResult({ ...clean, nonPassResults: 1 })).toBe("WARN");
    expect(classifySentinelResult({ ...clean, paused: true })).toBe("WARN");
  });

  it("Release cannot PASS without a build artifact and authenticated GitHub PR state", () => {
    const verified = {
      packageReadable: true,
      gitStatusOk: true,
      buildArtifactPresent: true,
      pullRequestVerified: true,
    };
    expect(classifyReleaseResult(verified)).toBe("PASS");
    expect(classifyReleaseResult({ ...verified, buildArtifactPresent: false })).toBe("UNKNOWN");
    expect(classifyReleaseResult({ ...verified, pullRequestVerified: false })).toBe("UNKNOWN");
    expect(classifyReleaseResult({ ...verified, gitStatusOk: false })).toBe("FAIL");
  });

  it("Security returns UNKNOWN when the effective endpoint or secret scan is unavailable", () => {
    const verified = {
      secretFilesFound: 0,
      secretScanComplete: true,
      endpointReadable: true,
      ownerGateVerified: true,
      workerGateVerified: true,
    };
    expect(classifySecurityResult({ ...verified, endpointReadable: false })).toBe("UNKNOWN");
    expect(classifySecurityResult({ ...verified, secretScanComplete: false })).toBe("UNKNOWN");
  });

  it("Security fails when either owner or worker authorization gate is missing", () => {
    const verified = {
      secretFilesFound: 0,
      secretScanComplete: true,
      endpointReadable: true,
      ownerGateVerified: true,
      workerGateVerified: true,
    };
    expect(classifySecurityResult({ ...verified, ownerGateVerified: false })).toBe("FAIL");
    expect(classifySecurityResult({ ...verified, workerGateVerified: false })).toBe("FAIL");
  });

  it("Security warns when environment files exist and passes only after complete clean evidence", () => {
    const verified = {
      secretFilesFound: 0,
      secretScanComplete: true,
      endpointReadable: true,
      ownerGateVerified: true,
      workerGateVerified: true,
      runtimeAuthorizationTestsVerified: true,
    };
    expect(classifySecurityResult(verified)).toBe("PASS");
    expect(classifySecurityResult({ ...verified, runtimeAuthorizationTestsVerified: false })).toBe("WARN");
    expect(classifySecurityResult({ ...verified, secretFilesFound: 1 })).toBe("WARN");
  });

  it("People returns UNKNOWN when any required source cannot be scanned", () => {
    expect(classifyPeopleScanResult({ scanComplete: false, piiFound: 0 })).toBe("UNKNOWN");
    expect(classifyPeopleScanResult({ scanComplete: false, piiFound: 2 })).toBe("WARN");
    expect(classifyPeopleScanResult({ scanComplete: true, piiFound: 0 })).toBe("PASS");
    expect(classifyPeopleScanResult({ scanComplete: true, piiFound: 2 })).toBe("WARN");
  });

  it("the live security specialist inspects the effective agency-control endpoint", async () => {
    const result = await SPECIALISTS.security(task("security"));
    expect(result.evidence.some((entry) => entry.includes("agency-control.ts"))).toBe(true);
    expect(result.evidence.some((entry) => entry.includes("owner gate (static): detectado"))).toBe(true);
    expect(result.evidence.some((entry) => entry.includes("worker gate (static): detectado"))).toBe(true);
    expect(result.evidence.some((entry) => entry.includes("autorización runtime: UNKNOWN"))).toBe(true);
    expect(result.result).toBe("WARN");
  });

  it("the live release specialist does not claim PASS without GitHub PR evidence", async () => {
    const result = await SPECIALISTS.release(task("release"));
    expect(result.result).toBe("UNKNOWN");
    expect(result.evidence.some((entry) => entry.includes("estado PR: UNKNOWN"))).toBe(true);
  });
});
