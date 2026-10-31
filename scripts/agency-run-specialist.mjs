/**
 * agency-run-specialist.mjs — Ejecuta un especialista de Agency y emite resultado JSON.
 *
 * Uso: node scripts/agency-run-specialist.mjs <specialistId> <taskId>
 *
 * Especialistas: finance, sales, supply, people, growth
 */

import { SPECIALISTS, SPECIALIST_IDS } from "../src/lib/agency/specialists.mjs";

const specialistId = process.argv[2];
const taskId = process.argv[3] || `t-cli-${Date.now()}`;

async function main() {
  if (!specialistId || !SPECIALIST_IDS.includes(specialistId)) {
    console.error(JSON.stringify({
      error: "ESPECIALISTA_NO_VALIDO",
      especialista: specialistId,
      validos: SPECIALIST_IDS,
    }));
    process.exitCode = 1;
    return;
  }

  const task = { id: taskId, title: `Tarea ${specialistId}`, agent_id: specialistId };

  try {
    const result = await SPECIALISTS[specialistId](task);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.result === "PASS" || result.result === "WARN" ? 0 : 1;
  } catch (error) {
    console.log(JSON.stringify({
      specialist: specialistId,
      taskId,
      result: "FAIL",
      evidence: [],
      errors: [error instanceof Error ? error.message : String(error)],
      durationMs: 0,
      timestamp: new Date().toISOString(),
    }, null, 2));
    process.exitCode = 1;
  }
}

main();