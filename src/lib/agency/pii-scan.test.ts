import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isValidChileanRut, scanPiiDirectories, scanPiiText } from "./pii-scan.mjs";

const temporaryRoots: string[] = [];
async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "nuva-agency-pii-"));
  temporaryRoots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Nüva Agency People PII scanner", () => {
  it("validates Chilean RUT check digits without retaining the value", () => {
    expect(isValidChileanRut("12.345.678-5")).toBe(true);
    expect(isValidChileanRut("12.345.678-9")).toBe(false);
  });

  it("detects email and valid RUT patterns and returns counts only", () => {
    const result = scanPiiText("Contacto: persona@example.cl; RUT: 12.345.678-5");
    expect(result).toEqual({ emailMatches: 1, rutMatches: 1, totalMatches: 2 });
    expect(JSON.stringify(result)).not.toContain("persona@example.cl");
    expect(JSON.stringify(result)).not.toContain("12.345.678-5");
  });

  it("scans fixture artifacts and redacts matches from all output", async () => {
    const root = await fixtureRoot();
    const directory = join(root, "logs", "executions");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "fixture.json"), JSON.stringify({ owner: "persona@example.cl", rut: "12.345.678-5" }));
    const result = await scanPiiDirectories([directory]);
    expect(result.status).toBe("FAIL");
    expect(result.scannedFiles).toBe(1);
    expect(result.filesWithFindings).toBe(1);
    expect(result.emailMatches).toBe(1);
    expect(result.rutMatches).toBe(1);
    expect(JSON.stringify(result)).not.toContain("persona@example.cl");
    expect(JSON.stringify(result)).not.toContain("12.345.678-5");
  });

  it("returns PASS for a complete clean fixture", async () => {
    const root = await fixtureRoot();
    const directory = join(root, "artifacts", "nuva-agency");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "clean.md"), "No personal identifiers in this synthetic report.");
    const result = await scanPiiDirectories([directory]);
    expect(result.status).toBe("PASS");
    expect(result.scannedFiles).toBe(1);
    expect(result.emailMatches + result.rutMatches).toBe(0);
  });

  it("returns UNKNOWN when no configured directory exists", async () => {
    const root = await fixtureRoot();
    const result = await scanPiiDirectories([join(root, "missing")]);
    expect(result.status).toBe("UNKNOWN");
    expect(result.scannedFiles).toBe(0);
  });

  it("ignores invalid RUT check digits", () => {
    expect(scanPiiText("RUT de fixture: 12.345.678-9").rutMatches).toBe(0);
  });
});
