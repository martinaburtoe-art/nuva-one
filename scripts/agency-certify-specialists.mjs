import { SPECIALISTS, SPECIALIST_IDS } from "../src/lib/agency/specialists.mjs";
import * as fs from "node:fs/promises";

const PROJECT = process.cwd();
const BACKLOG = `${PROJECT}/docs/nuva-agency/AGENT_BACKLOG.md`;

function taskFor(specialistId) {
  const base = { id: `cert-${specialistId}-001`, input_context: {} };
  switch (specialistId) {
    case "finance": return { ...base, type: "lockfile-check" };
    case "sales": return { ...base, type: "integration-verification" };
    case "supply": return { ...base, type: "inventory-check" };
    case "people": return { ...base, type: "pii-scan" };
    case "growth": return { ...base, type: "analytics-check" };
    case "orchestrator": return { ...base, type: "backlog-selection", input_context: { backlogPath: BACKLOG } };
    case "constructor": return { ...base, type: "syntax-check", input_context: { target: "scripts/agency-task-executor.mjs" } };
    case "compliance": return { ...base, type: "decision-audit" };
    case "security": return { ...base, type: "secret-scan" };
    case "qa": return { ...base, type: "unit-test-run", input_context: { target: "src/lib/agency/policy.test.ts" } };
    case "sentinel": return { ...base, type: "health-check" };
    case "ux": return { ...base, type: "route-inspection" };
    case "release": return { ...base, type: "git-status-check" };
    default: return { ...base, type: "generic" };
  }
}

async function main() {
  let allPass = true;
  const RESULTS = [];
  for (const id of SPECIALIST_IDS) {
    const specialist = SPECIALISTS[id];
    const task = taskFor(id);
    const start = Date.now();
    let result;
    try {
      result = await SPECIALISTS[id](task);
      result.durationMs = Date.now() - start;
      result.taskType = task.type;
    } catch (e) {
      result = {
        specialist: id,
        taskId: task.id,
        result: "FAIL",
        evidence: [`Excepción al ejecutar: ${e.message}`],
        errors: [e.message],
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        taskType: task.type,
      };
    }
    if (result.result === "FAIL" || result.result === "BLOCKED") allPass = false;
    RESULTS.push(result);
    console.log(`[${id}] ${task.type} → ${result.result} (${result.durationMs}ms)`);
    for (const e of result.evidence) console.log(`    • ${e}`);
    for (const err of result.errors) console.log(`    ! ${err}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    total: RESULTS.length,
    passed: RESULTS.filter(r => r.result === "PASS").length,
    warn: RESULTS.filter(r => r.result === "WARN").length,
    fail: RESULTS.filter(r => r.result === "FAIL").length,
    blocked: RESULTS.filter(r => r.result === "BLOCKED").length,
    allPass,
    specialists: RESULTS,
  };
  await fs.writeFile(`${PROJECT}/docs/launch/AGENCY_SPECIALIST_CERTIFICATION.json`, JSON.stringify(report, null, 2));
  console.log(`\n=== RESUMEN: ${report.passed} PASS / ${report.warn} WARN / ${report.fail} FAIL / ${report.blocked} BLOCKED ===`);
  process.exitCode = allPass ? 0 : 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
