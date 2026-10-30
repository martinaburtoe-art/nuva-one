import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const missionScript = resolve(process.cwd(), "scripts/agency-mission.mjs");

async function executeWithControlFile(controlFile: ".agency-pause" | ".agency-cancel") {
  const cwd = await mkdtemp(join(tmpdir(), "nuva-agency-mission-"));
  const missionPath = join(cwd, "logs", "missions", "m-test.json");

  try {
    await mkdir(join(cwd, "logs", "missions"), { recursive: true });
    const now = new Date().toISOString();
    await writeFile(missionPath, JSON.stringify({
      id: "m-test",
      objective: "Verificar control de misión",
      status: "active",
      createdAt: now,
      updatedAt: now,
      tasks: [{
        id: "t-001",
        specialist: "constructor",
        title: "No debe ejecutarse durante pausa o cancelación",
        status: "pending",
        dependsOn: [],
        attempts: 0,
        maxAttempts: 1,
        timeoutMs: 1000,
        result: null,
        evidence: [],
        errors: [],
        completedAt: null,
      }],
      decisions: [],
      result: null,
    }, null, 2));
    await writeFile(join(cwd, "logs", controlFile), "1");

    const { stdout } = await execFileAsync(process.execPath, [missionScript, "execute", "m-test"], {
      cwd,
      timeout: 10000,
    });
    const stored = JSON.parse(await readFile(missionPath, "utf8"));
    return { output: JSON.parse(stdout), stored };
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

describe("agency-mission ESM control files", () => {
  it("detecta .agency-pause y persiste la misión como paused", async () => {
    const { output, stored } = await executeWithControlFile(".agency-pause");
    expect(output.status).toBe("paused");
    expect(stored.status).toBe("paused");
    expect(stored.decisions[stored.decisions.length - 1]?.type).toBe("pause");
  });

  it("detecta .agency-cancel y persiste la misión como cancelled", async () => {
    const { output, stored } = await executeWithControlFile(".agency-cancel");
    expect(output.status).toBe("cancelled");
    expect(stored.status).toBe("cancelled");
    expect(stored.decisions[stored.decisions.length - 1]?.type).toBe("cancel");
  });
});
