/**
 * agency-mission.mjs — Gestión de misiones de Nüva Agency.
 *
 * Una misión es un objetivo descompuesto en tareas asignadas a especialistas,
 * con dependencias, reintentos, timeouts, paralelismo seguro, cancelación y
 * recuperación ante interrupciones. El estado se persiste en logs/missions/.
 *
 * Uso:
 *   node scripts/agency-mission.mjs create <objetivo> [--tareas <json>]
 *   node scripts/agency-mission.mjs execute <mission-id>
 *   node scripts/agency-mission.mjs status <mission-id>
 *   node scripts/agency-mission.mjs list
 *   node scripts/agency-mission.mjs cancel <mission-id>
 *
 * Ejemplo de creación con tareas predefinidas:
 *   node scripts/agency-mission.mjs create "Verificar build del proyecto" --tareas '[{"specialist":"constructor","title":"Verificar sintaxis executor","dependsOn":[]}]'
 */

import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

const MISSIONS_DIR = join("logs", "missions");
const EXECUTIONS_DIR = join("logs", "executions");
const CANCEL_FILE = join("logs", ".agency-cancel");
const PAUSE_FILE = join("logs", ".agency-pause");
const SPECIALIST_RUNNER = "scripts/agency-run-specialist.mjs";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 120000;

// --- Utilidades ---

function nowIso() {
  return new Date().toISOString();
}

function missionId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `m-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${ms}`;
}

async function readJsonFile(path) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJsonFile(path, data) {
  await mkdir(join("logs", "missions"), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
}

function listMissionFiles() {
  return readdir(MISSIONS_DIR).catch(() => []);
}

// --- Descomposición automática de objetivo en tareas ---

function decomposeObjective(objective) {
  const o = objective.toLowerCase();
  const tasks = [];

  if (/\bbuild\b/.test(o) || /\bcompil\b/.test(o)) {
    tasks.push({
      specialist: "constructor",
      title: "Verificar sintaxis y build del proyecto",
      dependsOn: [],
    });
  }
  if (/\btest\b/.test(o) || /\bpruebas?\b/.test(o)) {
    tasks.push({
      specialist: "qa",
      title: "Ejecutar suite de pruebas",
      dependsOn: [],
    });
  }
  if (/\bleak\b/.test(o) || /\bsecret\b/.test(o) || /\bsegur\b/.test(o)) {
    tasks.push({
      specialist: "security",
      title: "Escanear secretos expuestos",
      dependsOn: [],
    });
  }
  if (/\baccesib\b/.test(o) || /\bux\b/.test(o) || /\binterfaz\b/.test(o)) {
    tasks.push({
      specialist: "ux",
      title: "Revisar accesibilidad de la interfaz",
      dependsOn: [],
    });
  }
  if (/\bcumpl\b/.test(o) || /\bpolicy\b/.test(o) || /\bnorma\b/.test(o)) {
    tasks.push({
      specialist: "compliance",
      title: "Verificar cumplimiento de políticas",
      dependsOn: [],
    });
  }

  // Asignar IDs ANTES de establecer dependencias del sentinel
  for (let i = 0; i < tasks.length; i++) {
    tasks[i].id = `t-${String(i + 1).padStart(3, "0")}`;
  }

  // Siempre agregar sentinel como monitoreo final (depende de todas las previas)
  tasks.push({
    id: `t-${String(tasks.length + 1).padStart(3, "0")}`,
    specialist: "sentinel",
    title: "Verificar estado del sistema tras ejecución",
    dependsOn: tasks.map((t) => t.id),
  });

  // Si no se detectó ningún dominio, tarea genérica de constructor
  if (tasks.length === 1 && tasks[0].specialist === "sentinel") {
    tasks[0] = {
      id: "t-001",
      specialist: "constructor",
      title: "Ejecutar tarea genérica: " + objective,
      dependsOn: [],
    };
    tasks.push({
      id: "t-002",
      specialist: "sentinel",
      title: "Verificar estado del sistema tras ejecución",
      dependsOn: ["t-001"],
    });
  }

  return tasks;
}

// --- Creación de misión ---

async function createMission(objective, tasksJson) {
  await mkdir(MISSIONS_DIR, { recursive: true });

  let tasks;
  if (tasksJson) {
    try {
      tasks = JSON.parse(tasksJson);
    } catch {
      console.error(JSON.stringify({ error: "TAREAS_JSON_INVALIDO", detail: "No se pudo parsear --tareas" }));
      process.exitCode = 1;
      return;
    }
  } else {
    tasks = decomposeObjective(objective);
  }

  const now = nowIso();
  const mission = {
    id: missionId(),
    objective,
    status: "active",
    createdAt: now,
    updatedAt: now,
    tasks: tasks.map((t) => ({
      id: t.id,
      specialist: t.specialist,
      title: t.title,
      status: "pending",
      dependsOn: t.dependsOn || [],
      attempts: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      result: null,
      evidence: [],
      errors: [],
      completedAt: null,
    })),
    decisions: [],
    result: null,
  };

  const path = join(MISSIONS_DIR, `${mission.id}.json`);
  await writeJsonFile(path, mission);

  console.log(JSON.stringify({
    missionId: mission.id,
    status: mission.status,
    tasks: mission.tasks.length,
    createdAt: mission.createdAt,
  }, null, 2));
}

// --- Ejecución de misión ---

function isCancelled() {
  try {
    require("node:fs").statSync(CANCEL_FILE);
    return true;
  } catch {
    return false;
  }
}

function isPaused() {
  try {
    require("node:fs").statSync(PAUSE_FILE);
    return true;
  } catch {
    return false;
  }
}

function recordDecision(mission, decision) {
  mission.decisions.push({
    timestamp: nowIso(),
    ...decision,
  });
}

async function runSpecialist(specialistId, taskId, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = execFile("node", [SPECIALIST_RUNNER, specialistId, taskId], {
      timeout: timeoutMs,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("close", (code, signal) => {
      resolve({
        exitCode: code,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - start,
        timedOut: false,
      });
    });
    child.on("timeout", () => {
      child.kill();
      resolve({
        exitCode: -1,
        signal: "SIGTERM",
        stdout,
        stderr: "Command timed out",
        durationMs: Date.now() - start,
        timedOut: true,
      });
    });
    child.on("error", (err) => {
      resolve({
        exitCode: -1,
        signal: null,
        stdout,
        stderr: err.message || String(err),
        durationMs: Date.now() - start,
        timedOut: false,
      });
    });
  });
}

function parseSpecialistOutput(stdout) {
  try {
    const jsonStart = stdout.indexOf("{");
    const jsonEnd = stdout.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
    }
  } catch {
    // Ignorar, devolver null
  }
  return null;
}

function depsResolved(tasksById, task) {
  const deps = task.dependsOn || [];
  if (deps.length === 0) return true;
  return deps.every((d) => tasksById[d] && tasksById[d].status === "completed");
}

function allTasksTerminal(tasks) {
  return tasks.every((t) => t.status === "completed" || t.status === "failed" || t.status === "blocked");
}

async function executeMission(missionId) {
  const path = join(MISSIONS_DIR, `${missionId}.json`);
  let mission = await readJsonFile(path);
  if (!mission) {
    console.error(JSON.stringify({ error: "MISION_NO_ENCONTRADA", missionId }));
    process.exitCode = 1;
    return;
  }

  if (mission.status !== "active") {
    console.error(JSON.stringify({
      error: "MISION_NO_ACTIVA",
      missionId,
      status: mission.status,
    }));
    process.exitCode = 1;
    return;
  }

  const tasksById = {};
  for (const t of mission.tasks) tasksById[t.id] = t;

  let anyExecuted = false;

  while (!allTasksTerminal(mission.tasks)) {
    // Cancelación
    if (isCancelled()) {
      recordDecision(mission, { type: "cancel", detail: "Cancelación solicitada por archivo .agency-cancel" });
      mission.status = "cancelled";
      mission.updatedAt = nowIso();
      mission.result = "cancelled";
      await writeJsonFile(path, mission);
      console.log(JSON.stringify({ missionId, status: "cancelled", reason: "cancelRequested" }, null, 2));
      return;
    }

    // Pausa
    if (isPaused()) {
      recordDecision(mission, { type: "pause", detail: "Sistema en pausa (.agency-pause presente)" });
      mission.status = "paused";
      mission.updatedAt = nowIso();
      await writeJsonFile(path, mission);
      console.log(JSON.stringify({ missionId, status: "paused", reason: "pauseRequested" }, null, 2));
      return;
    }

    // Seleccionar tareas ejecutables (pendientes con deps resueltas)
    const ready = mission.tasks.filter(
      (t) => t.status === "pending" && depsResolved(tasksById, t)
    );

    if (ready.length === 0) {
      // No hay tareas listas pero no todas son terminales → bloqueo por dependencias
      const blocked = mission.tasks.filter((t) => t.status === "pending");
      for (const t of blocked) {
        t.status = "blocked";
        t.errors = t.errors || [];
        t.errors.push("Dependencias no resueltas al finalizar ciclo");
      }
      recordDecision(mission, { type: "blocked", detail: `Tareas bloqueadas sin dependencias resueltas: ${blocked.map((t) => t.id).join(",")}` });
      break;
    }

    // Ejecutar tareas listas en paralelo (seguro: no hay dependencias entre ellas)
    const results = await Promise.all(ready.map(async (t) => {
      const specialist = t.specialist;
      const taskId = t.id;
      const maxAttempts = t.maxAttempts || DEFAULT_MAX_ATTEMPTS;
      const timeoutMs = t.timeoutMs || DEFAULT_TIMEOUT_MS;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        t.attempts = attempt;

        // Verificar cancelación/pausa entre intentos
        if (isCancelled()) {
          t.status = "cancelled";
          return { taskId, specialist, result: "cancelled", attempt };
        }
        if (isPaused()) {
          t.status = "paused";
          return { taskId, specialist, result: "paused", attempt };
        }

        recordDecision(mission, {
          type: "execute",
          taskId,
          specialist,
          attempt,
          maxAttempts,
        });

        const run = await runSpecialist(specialist, taskId, timeoutMs);

        let specialistResult = null;
        if (run.stdout) {
          specialistResult = parseSpecialistOutput(run.stdout);
        }

        const evidence = [
          `Comando: node ${SPECIALIST_RUNNER} ${specialist} ${taskId}`,
          `Intento: ${attempt}/${maxAttempts}`,
          `Duración: ${run.durationMs} ms`,
          `Código de salida: ${run.exitCode}`,
        ];
        if (run.timedOut) evidence.push("Timeout alcanzado");
        if (run.stderr) evidence.push(`stderr: ${run.stderr.slice(0, 200)}`);

        let taskResult;
        if (specialistResult) {
          taskResult = specialistResult.result;
          evidence.push(...(specialistResult.evidence || []));
          if (specialistResult.errors && specialistResult.errors.length) {
            evidence.push(`Errores: ${specialistResult.errors.join(" | ")}`);
          }
        } else {
          taskResult = run.exitCode === 0 ? "PASS" : "FAIL";
        }

        const success = taskResult === "PASS" || taskResult === "WARN";

        if (success) {
          t.status = "completed";
          t.result = taskResult;
          t.evidence = evidence;
          t.completedAt = nowIso();
          recordDecision(mission, { type: "taskCompleted", taskId, specialist, result: taskResult, attempt });
          anyExecuted = true;
          return { taskId, specialist, result: taskResult, attempt, completed: true };
        }

        // Fallo: reintentar si quedan intentos
        t.errors = t.errors || [];
        t.errors.push(`Intento ${attempt} falló: ${taskResult}`);
        if (attempt < maxAttempts) {
          recordDecision(mission, { type: "retry", taskId, specialist, attempt, maxAttempts });
          continue;
        }

        t.status = "failed";
        t.result = taskResult;
        t.evidence = evidence;
        t.completedAt = nowIso();
        recordDecision(mission, { type: "taskFailed", taskId, specialist, result: taskResult, attempts: attempt });
        anyExecuted = true;
        return { taskId, specialist, result: taskResult, attempt, completed: false };
      }
    }));

    // Guardar estado tras cada lote (recuperación ante interrupciones)
    mission.updatedAt = nowIso();
    await writeJsonFile(path, mission);

    // Verificar si alguna tarea falló sin reintentos restantes → misión puede continuar con las demás
    const failed = results.filter((r) => r.result === "FAIL" && !r.completed);
    if (failed.length > 0) {
      recordDecision(mission, {
        type: "failures",
        detail: failed.map((r) => `${r.taskId} (${r.specialist})`).join(","),
      });
    }
  }

  // Determinar resultado final de la misión
  const completed = mission.tasks.filter((t) => t.status === "completed").length;
  const failed = mission.tasks.filter((t) => t.status === "failed").length;
  const blocked = mission.tasks.filter((t) => t.status === "blocked").length;

  if (failed === 0 && blocked === 0 && completed === mission.tasks.length) {
    mission.status = "completed";
    mission.result = "PASS";
  } else if (failed > 0 || blocked > 0) {
    mission.status = "completed";
    mission.result = "FAIL";
  } else {
    mission.status = "completed";
    mission.result = "WARN";
  }

  mission.updatedAt = nowIso();
  await writeJsonFile(path, mission);

  console.log(JSON.stringify({
    missionId,
    status: mission.status,
    result: mission.result,
    tasks: mission.tasks.length,
    completed,
    failed,
    blocked,
    decisions: mission.decisions.length,
  }, null, 2));
}

// --- Estado de misión ---

async function missionStatus(missionId) {
  const path = join(MISSIONS_DIR, `${missionId}.json`);
  const mission = await readJsonFile(path);
  if (!mission) {
    console.error(JSON.stringify({ error: "MISION_NO_ENCONTRADA", missionId }));
    process.exitCode = 1;
    return;
  }

  const completed = mission.tasks.filter((t) => t.status === "completed").length;
  const failed = mission.tasks.filter((t) => t.status === "failed").length;
  const pending = mission.tasks.filter((t) => t.status === "pending").length;
  const blocked = mission.tasks.filter((t) => t.status === "blocked").length;

  console.log(JSON.stringify({
    missionId: mission.id,
    objective: mission.objective,
    status: mission.status,
    result: mission.result,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
    tasks: {
      total: mission.tasks.length,
      completed,
      failed,
      pending,
      blocked,
    },
    tasksDetail: mission.tasks.map((t) => ({
      id: t.id,
      specialist: t.specialist,
      title: t.title,
      status: t.status,
      result: t.result,
      attempts: t.attempts,
      dependsOn: t.dependsOn,
    })),
    decisions: mission.decisions.slice(-10),
  }, null, 2));
}

// --- Listar misiones ---

async function listMissions() {
  const files = await listMissionFiles();
  const missions = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const m = await readJsonFile(join(MISSIONS_DIR, f));
    if (m) {
      missions.push({
        id: m.id,
        objective: m.objective,
        status: m.status,
        result: m.result,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        tasks: m.tasks.length,
      });
    }
  }
  missions.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  console.log(JSON.stringify({ missions, count: missions.length }, null, 2));
}

// --- Cancelar misión ---

async function cancelMission(missionId) {
  const path = join(MISSIONS_DIR, `${missionId}.json`);
  const mission = await readJsonFile(path);
  if (!mission) {
    console.error(JSON.stringify({ error: "MISION_NO_ENCONTRADA", missionId }));
    process.exitCode = 1;
    return;
  }
  mission.status = "cancelled";
  mission.result = "cancelled";
  mission.updatedAt = nowIso();
  recordDecision(mission, { type: "cancel", detail: "Cancelación explícita vía CLI" });
  await writeJsonFile(path, mission);
  console.log(JSON.stringify({ missionId, status: "cancelled" }, null, 2));
}

// --- CLI ---

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.error(JSON.stringify({
      error: "COMANDO_REQUERIDO",
      validos: ["create", "execute", "status", "list", "cancel"],
    }));
    process.exitCode = 1;
    return;
  }

  try {
    switch (cmd) {
      case "create": {
        const objective = args[1];
        if (!objective) {
          console.error(JSON.stringify({ error: "OBJETIVO_REQUERIDO" }));
          process.exitCode = 1;
          return;
        }
        let tasksJson = null;
        for (let i = 2; i < args.length; i++) {
          if (args[i] === "--tareas" && args[i + 1]) {
            tasksJson = args[i + 1];
            i++;
          }
        }
        await createMission(objective, tasksJson);
        break;
      }
      case "execute": {
        const missionId = args[1];
        if (!missionId) {
          console.error(JSON.stringify({ error: "MISION_ID_REQUERIDO" }));
          process.exitCode = 1;
          return;
        }
        await executeMission(missionId);
        break;
      }
      case "status": {
        const missionId = args[1];
        if (!missionId) {
          console.error(JSON.stringify({ error: "MISION_ID_REQUERIDO" }));
          process.exitCode = 1;
          return;
        }
        await missionStatus(missionId);
        break;
      }
      case "list":
        await listMissions();
        break;
      case "cancel": {
        const missionId = args[1];
        if (!missionId) {
          console.error(JSON.stringify({ error: "MISION_ID_REQUERIDO" }));
          process.exitCode = 1;
          return;
        }
        await cancelMission(missionId);
        break;
      }
      default:
        console.error(JSON.stringify({ error: "COMANDO_DESCONOCIDO", comando: cmd }));
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(JSON.stringify({ error: "EXCEPCION", message: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}

main();